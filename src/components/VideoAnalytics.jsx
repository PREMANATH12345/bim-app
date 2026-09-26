import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, ChevronDown, ChevronUp, X } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const VideoAnalytics = () => {
  const API_URL = import.meta.env.VITE_URL;
  const token = localStorage.getItem("token");
  const { videoId: routeVideoId } = useParams();

  const [videos, setVideos] = useState([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState(routeVideoId ? [String(routeVideoId)] : []);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Always-visible user-name search (client-side filter over whatever is currently loaded)
  const [userSearch, setUserSearch] = useState("");

  // Clicking "Search" next to Search-user-name calls /admin/users/search-context,
  // aware of whatever batch(es)/video(s) are currently selected, and shows either
  // the matching user(s)' watch details or an explanatory message per user.
  const [globalSearchActive, setGlobalSearchActive] = useState(false);
  const [globalSearchRows, setGlobalSearchRows] = useState([]);
  const [globalSearchMessages, setGlobalSearchMessages] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState(null);

  // Tracks which messages the admin has closed (X) so they can be dismissed
  // without deleting the underlying error/message state itself.
  const [dismissedActiveError, setDismissedActiveError] = useState(null);
  const [dismissedGlobalMsgIndexes, setDismissedGlobalMsgIndexes] = useState(() => new Set());

  // Type-ahead suggestions for the "Search User Name" box (e.g. typing "A" -> "Aravind (3A/2025)")
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [userSuggestionsOpen, setUserSuggestionsOpen] = useState(false);
  const userSearchBoxRef = useRef(null);
  const suggestionsTimerRef = useRef(null);

  // Batch multi-select (chip / type-to-search)
  const [batches, setBatches] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchSearchInput, setBatchSearchInput] = useState("");
  const batchDropdownRef = useRef(null);

  // Video multi-select (chip / type-to-search, same pattern as batches)
  const [videoSearchInput, setVideoSearchInput] = useState("");
  const [videoDropdownOpen, setVideoDropdownOpen] = useState(false);
  const videoBoxRef = useRef(null);

  // Batch-wide aggregated watched-user details (used when batch(es) selected but no video picked)
  const [batchRows, setBatchRows] = useState([]);
  const [batchRowsLoading, setBatchRowsLoading] = useState(false);
  const [batchRowsError, setBatchRowsError] = useState(null);

  // Multi-video aggregated watched-user details (used when 2+ specific videos are selected)
  const [videosRows, setVideosRows] = useState([]);
  const [videosRowsLoading, setVideosRowsLoading] = useState(false);
  const [videosRowsError, setVideosRowsError] = useState(null);

  const normalizeViewRecord = (view = {}, fallback = {}) => ({
    ...view,
    view_id: view.view_id ?? view.id ?? view.viewId ?? null,
    view_number: view.view_number ?? view.viewNumber ?? null,
    device_type: view.device_type ?? view.deviceType ?? fallback.device_type ?? "Unknown",
    watch_duration_seconds: view.watch_duration_seconds ?? view.watchDurationSeconds ?? fallback.watch_duration_seconds ?? null,
    started_at: view.started_at ?? view.startedAt ?? fallback.started_at ?? null,
    ended_at: view.ended_at ?? view.endedAt ?? fallback.ended_at ?? null,
  });

  const normalizeAnalyticsUsers = (payload) => {
    const list = Array.isArray(payload?.users) ? payload.users : [];
    return list
      .map((entry) => ({
        ...entry,
        views: (entry.views || []).map((v) => normalizeViewRecord(v, entry)),
      }))
      .filter((u) => Array.isArray(u.views) && u.views.length > 0);
  };

  const fetchAnalytics = async (videoId) => {
    if (!videoId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const summaryRes = await fetch(`${API_URL}/videos/${videoId}/analytics-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!summaryRes.ok) throw new Error(`Analytics summary failed: ${summaryRes.status}`);
      const summaryData = await summaryRes.json();

      const summary = {
        totalViews: summaryData.totalViews ?? 0,
        uniqueViewers: summaryData.uniqueViewers ?? 0,
        avgWatchSeconds: summaryData.avgWatchSeconds ?? 0,
        repeatViewers: summaryData.repeatViewers ?? 0,
      };

      const usersRes = await fetch(`${API_URL}/admin/videos/${videoId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!usersRes.ok) throw new Error(`Analytics users failed: ${usersRes.status}`);
      const usersData = await usersRes.json();
      const users = normalizeAnalyticsUsers(usersData);

      setAnalytics({ summary, users });
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setLoadError("Could not load analytics for this video.");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const getBatchLabel = (b) => b?.name ?? b?.batch_name ?? (b?.id != null ? `Batch #${b.id}` : "Unnamed batch");

  const findBatchIdByLabel = (label) => {
    if (!label) return null;
    const match = batches.find((b) => getBatchLabel(b) === label);
    return match ? String(match.id) : null;
  };

  // user_batch sometimes comes back as a JSON array string (e.g. '["2/2024","3/2024"]')
  // when a student belongs to multiple batches. Render that as a plain comma list
  // instead of showing the raw brackets/quotes.
  const formatUserBatch = (batch) => {
    if (batch == null) return "";
    if (Array.isArray(batch)) return batch.join(", ");
    const str = String(batch).trim();
    if (str.startsWith("[") && str.endsWith("]")) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch (e) {
        // not valid JSON, fall through and show the raw string
      }
    }
    return str;
  };

  const fetchBatchRows = async (batchNames) => {
    if (!batchNames || batchNames.length === 0) {
      setBatchRows([]);
      return;
    }
    setBatchRowsLoading(true);
    setBatchRowsError(null);
    try {
      const params = new URLSearchParams();
      params.append("batchIds", batchNames.join(","));
      const res = await fetch(`${API_URL}/admin/batches/videos-analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Batch analytics failed: ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const normalized = rows.map((r) => ({
        ...r,
        views: (r.views || []).map((v) => normalizeViewRecord(v, r)),
      }));
      setBatchRows(normalized);
      if (normalized.length === 0) {
        setBatchRowsError("No watch history found for the selected batch(es) yet.");
      }
    } catch (err) {
      console.error("Failed to load batch analytics:", err);
      setBatchRowsError("Could not load watch details for the selected batch(es).");
      setBatchRows([]);
    } finally {
      setBatchRowsLoading(false);
    }
  };

  const fetchVideosRows = async (videoIds) => {
    if (!videoIds || videoIds.length === 0) {
      setVideosRows([]);
      return;
    }
    setVideosRowsLoading(true);
    setVideosRowsError(null);
    try {
      const params = new URLSearchParams();
      params.append("videoIds", videoIds.join(","));
      const res = await fetch(`${API_URL}/admin/videos/videos-analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Videos analytics failed: ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const normalized = rows.map((r) => ({
        ...r,
        views: (r.views || []).map((v) => normalizeViewRecord(v, r)),
      }));
      setVideosRows(normalized);
      if (normalized.length === 0) {
        setVideosRowsError("No watch history found for the selected videos yet.");
      }
    } catch (err) {
      console.error("Failed to load videos analytics:", err);
      setVideosRowsError("Could not load watch details for the selected videos.");
      setVideosRows([]);
    } finally {
      setVideosRowsLoading(false);
    }
  };

  // Called by the "Search" button (or Enter) next to "Search User name".
  // Looks up the matching student(s), aware of whatever batch(es)/video(s)
  // are currently selected on the page.
  const runGlobalUserSearch = async (queryOverride) => {
    const q = (queryOverride ?? userSearch).trim();
    if (!q) {
      setGlobalSearchActive(false);
      setGlobalSearchRows([]);
      setGlobalSearchMessages([]);
      setGlobalSearchError(null);
      setDismissedGlobalMsgIndexes(new Set());
      return;
    }
    setGlobalSearchActive(true);
    setGlobalSearchLoading(true);
    setGlobalSearchError(null);
    try {
      const batchNames = selectedBatchIds
        .map((idStr) => batches.find((b) => String(b.id) === idStr))
        .filter(Boolean)
        .map((b) => getBatchLabel(b));

      const params = new URLSearchParams();
      params.append("name", q);
      if (batchNames.length > 0) params.append("batchIds", batchNames.join(","));
      if (selectedVideoIds.length > 0) params.append("videoIds", selectedVideoIds.join(","));

      const res = await fetch(`${API_URL}/admin/users/search-context?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      const matches = Array.isArray(data.matches) ? data.matches : [];

      if (matches.length === 0) {
        setGlobalSearchRows([]);
        setGlobalSearchMessages([]);
        setDismissedGlobalMsgIndexes(new Set());
        setGlobalSearchError(`No user found matching "${q}".`);
        return;
      }

      const messages = [];
      const rows = [];
      const selectedVideoTitles = selectedVideoIds
        .map((id) => videos.find((v) => String(v.id) === id)?.title)
        .filter(Boolean);
      const videoLabel = selectedVideoTitles.length > 0 ? selectedVideoTitles.join(", ") : "the selected video";

      matches.forEach((m) => {
        const who = `${m.user_name || "This user"} (ID: ${m.user_id})`;
        if (batchNames.length > 0 && !m.in_selected_batches) {
          messages.push(`${who} is not part of the selected batch(es).`);
          return;
        }
        if (selectedVideoIds.length > 0 && !m.watched_selected_video) {
          messages.push(`${who} is in the selected batch(es) but hasn't watched "${videoLabel}" yet.`);
          return;
        }
        if (!m.videos || m.videos.length === 0) {
          messages.push(`${who} has no recorded watch history yet.`);
          return;
        }
        m.videos.forEach((v) => {
          rows.push({
            key: `${m.user_id}_${v.video_id}`,
            user_id: m.user_id,
            user_name: m.user_name,
            video_id: v.video_id,
            video_title: v.video_title,
            views: (v.views || []).map((view) => normalizeViewRecord(view)),
          });
        });
      });

      setGlobalSearchRows(rows);
      setGlobalSearchMessages(messages);
      setDismissedGlobalMsgIndexes(new Set());
      setGlobalSearchError(rows.length === 0 && messages.length === 0 ? `No watch history found for "${q}".` : null);
    } catch (err) {
      console.error("Failed to search user watch history:", err);
      setGlobalSearchError("Could not search watch history. Please try again.");
      setGlobalSearchRows([]);
      setGlobalSearchMessages([]);
      setDismissedGlobalMsgIndexes(new Set());
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  // Fetches lightweight type-ahead suggestions as the admin types in "Search User Name"
  // (debounced), e.g. typing "A" shows "Aravind (3A/2025)".
  const fetchUserSuggestions = (query) => {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    const q = query.trim();
    if (!q) {
      setUserSuggestions([]);
      setUserSuggestionsOpen(false);
      return;
    }
    suggestionsTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.append("name", q);
        const res = await fetch(`${API_URL}/admin/users/search-context?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Suggestion request failed: ${res.status}`);
        const data = await res.json();
        const matches = Array.isArray(data.matches) ? data.matches : [];
        setUserSuggestions(matches.slice(0, 8));
        setUserSuggestionsOpen(matches.length > 0);
      } catch (err) {
        console.error("Failed to fetch user suggestions:", err);
        setUserSuggestions([]);
        setUserSuggestionsOpen(false);
      }
    }, 250);
  };

  // Load batches once
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch(`${API_URL}/batches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Batches request failed: ${res.status}`);
        const data = await res.json();
        setBatches(data.batches || []);
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    };
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load videos whenever batch selection or search text changes
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoadError(null);
        const params = new URLSearchParams();
        const batchNames = selectedBatchIds
          .map((idStr) => batches.find((b) => String(b.id) === idStr))
          .filter(Boolean)
          .map((b) => getBatchLabel(b));
        if (batchNames.length > 0) params.append("batchIds", batchNames.join(","));
        if (videoSearchInput.trim()) params.append("search", videoSearchInput.trim());

        const res = await fetch(`${API_URL}/videos/list?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Video list request failed: ${res.status}`);
        const data = await res.json();
        setVideos(Array.isArray(data.videos) ? data.videos : []);
      } catch (err) {
        console.error("Failed to load videos:", err);
        setLoadError("Could not load the available video list.");
      }
    };
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchIds, videoSearchInput, batches, token, API_URL]);

  // When exactly one specific video is selected, load that video's analytics
  useEffect(() => {
    if (selectedVideoIds.length !== 1) {
      setAnalytics(null);
      setLastUpdated(null);
      return;
    }
    fetchAnalytics(selectedVideoIds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoIds, token, API_URL]);

  // When 2+ specific videos are selected, load the aggregated multi-video view
  useEffect(() => {
    if (selectedVideoIds.length > 1) {
      fetchVideosRows(selectedVideoIds);
    } else {
      setVideosRows([]);
      setVideosRowsError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoIds, token, API_URL]);

  // When batch(es) are selected and no video is picked, load the aggregated batch view
  useEffect(() => {
    if (selectedVideoIds.length > 0) return; // a specific video (or videos) takes priority
    const batchNames = selectedBatchIds
      .map((idStr) => batches.find((b) => String(b.id) === idStr))
      .filter(Boolean)
      .map((b) => getBatchLabel(b));
    if (batchNames.length > 0) {
      fetchBatchRows(batchNames);
    } else {
      setBatchRows([]);
      setBatchRowsError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchIds, batches, selectedVideoIds, token, API_URL]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target)) {
        setBatchDropdownOpen(false);
      }
      if (videoBoxRef.current && !videoBoxRef.current.contains(e.target)) {
        setVideoDropdownOpen(false);
      }
      if (userSearchBoxRef.current && !userSearchBoxRef.current.contains(e.target)) {
        setUserSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "-";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const selectedVideo = selectedVideoIds.length === 1 ? videos.find((v) => String(v.id) === selectedVideoIds[0]) : null;

  const toggleVideoSelection = (videoId) => {
    const idStr = String(videoId);
    setSelectedVideoIds((prev) => (prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]));
    setAnalytics(null);
    setLoadError(null);
    setLastUpdated(null);
    setExpandedRowKey(null);
    setVideoSearchInput("");
    setGlobalSearchActive(false);
  };

  const toggleBatchSelection = (batchId) => {
    const idStr = String(batchId);
    setSelectedBatchIds((prev) => (prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]));
    setSelectedVideoIds([]);
    setAnalytics(null);
    setGlobalSearchActive(false);
  };

  // Clears every search/selection on the page: user name search, selected
  // batch(es), selected video(s), and whatever results/messages they produced.
  const resetAll = () => {
    setUserSearch("");
    setUserSuggestions([]);
    setUserSuggestionsOpen(false);
    setGlobalSearchActive(false);
    setGlobalSearchRows([]);
    setGlobalSearchMessages([]);
    setGlobalSearchError(null);
    setDismissedGlobalMsgIndexes(new Set());

    setSelectedBatchIds([]);
    setBatchSearchInput("");
    setBatchDropdownOpen(false);
    setBatchRows([]);
    setBatchRowsError(null);

    setSelectedVideoIds([]);
    setVideoSearchInput("");
    setVideoDropdownOpen(false);
    setVideosRows([]);
    setVideosRowsError(null);

    setAnalytics(null);
    setLoadError(null);
    setLastUpdated(null);
    setExpandedRowKey(null);
    setDismissedActiveError(null);
  };

  // --- Build the single active dataset to render ---
  const mode = globalSearchActive
    ? "userSearch"
    : selectedVideoIds.length === 1
    ? "video"
    : selectedVideoIds.length > 1
    ? "videos"
    : selectedBatchIds.length > 0
    ? "batch"
    : "empty";

  const activeRows = (() => {
    if (mode === "userSearch") {
      return globalSearchRows;
    }
    if (mode === "video") {
      return (analytics?.users || []).map((u) => ({
        key: `${u.user_id}_${selectedVideoIds[0]}`,
        user_id: u.user_id,
        user_name: u.user_name,
        video_id: selectedVideoIds[0],
        video_title: selectedVideo?.title || "Unknown video",
        views: u.views,
      }));
    }
    if (mode === "videos") {
      return videosRows.map((r) => ({
        key: `${r.user_id}_${r.video_id}`,
        user_id: r.user_id,
        user_name: r.user_name,
        video_id: r.video_id,
        video_title: r.video_title,
        views: r.views,
      }));
    }
    if (mode === "batch") {
      return batchRows.map((r) => ({
        key: `${r.user_id}_${r.video_id}`,
        user_id: r.user_id,
        user_name: r.user_name,
        video_id: r.video_id,
        video_title: r.video_title,
        views: r.views,
      }));
    }
    return [];
  })();

  const filteredRows = activeRows.filter((row) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return String(row.user_name).toLowerCase().includes(q) || String(row.user_id).toLowerCase().includes(q);
  });

  const activeLoading =
    mode === "video" ? loading
    : mode === "videos" ? videosRowsLoading
    : mode === "batch" ? batchRowsLoading
    : mode === "userSearch" ? globalSearchLoading
    : false;
  const activeError =
    mode === "video" ? loadError
    : mode === "videos" ? videosRowsError
    : mode === "batch" ? batchRowsError
    : mode === "userSearch" ? globalSearchError
    : null;

  // --- Chip UI helpers ---
  const filteredBatchOptions = batches
    .filter((b) => !selectedBatchIds.includes(String(b.id)))
    .filter((b) => !batchSearchInput.trim() || getBatchLabel(b).toLowerCase().includes(batchSearchInput.trim().toLowerCase()));

  const filteredVideoOptions = videos.filter((v) => !selectedVideoIds.includes(String(v.id)));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Video analytics</h1>
          </div>

          {/* Search user name + Select batch(es) + Select a video: one horizontal row on desktop, stacked on mobile (unchanged) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <X className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Search user name */}
              <div className="relative" ref={userSearchBoxRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search User Name</label>
                <div className="flex flex-row gap-2 items-stretch">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUserSearch(value);
                      fetchUserSuggestions(value);
                      if (!value.trim()) {
                        setGlobalSearchActive(false);
                        setGlobalSearchRows([]);
                        setGlobalSearchMessages([]);
                        setGlobalSearchError(null);
                      }
                    }}
                    onFocus={() => {
                      if (userSuggestions.length > 0) setUserSuggestionsOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setUserSuggestionsOpen(false);
                        runGlobalUserSearch();
                      } else if (e.key === "Escape") {
                        setUserSuggestionsOpen(false);
                      }
                    }}
                    placeholder="Search by User Name"
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUserSuggestionsOpen(false);
                      runGlobalUserSearch();
                    }}
                    className="shrink-0 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>

                {userSuggestionsOpen && userSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {userSuggestions.map((m) => (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          setUserSearch(m.user_name);
                          setUserSuggestionsOpen(false);
                          const batchId = findBatchIdByLabel(m.user_batch);
                          if (batchId) setSelectedBatchIds([batchId]);
                          runGlobalUserSearch(m.user_name);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                      >
                        {m.user_name}
                        {m.user_batch ? ` (${formatUserBatch(m.user_batch)})` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Batch chips */}
              <div className="relative" ref={batchDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Batch(es)</label>
                <div
                  className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white cursor-text"
                  onClick={() => setBatchDropdownOpen(true)}
                >
                  {selectedBatchIds.map((idStr) => {
                    const match = batches.find((b) => String(b.id) === idStr);
                    const label = match ? getBatchLabel(match) : idStr;
                    return (
                      <span
                        key={idStr}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBatchSelection(idStr);
                          }}
                          className="hover:text-blue-950"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={batchSearchInput}
                    onChange={(e) => {
                      setBatchSearchInput(e.target.value);
                      setBatchDropdownOpen(true);
                    }}
                    onFocus={() => setBatchDropdownOpen(true)}
                    placeholder={selectedBatchIds.length === 0 ? "Type to search, e.g. 3A/2025" : "Add another..."}
                    className="flex-1 min-w-[100px] outline-none text-sm py-0.5"
                  />
                </div>

                {batchDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {filteredBatchOptions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No matching batches.</p>
                    ) : (
                      filteredBatchOptions.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            toggleBatchSelection(b.id);
                            setBatchSearchInput("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          {getBatchLabel(b)} <span className="text-xs text-gray-400">(ID: {b.id})</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Video chips (multi-select, same pattern as batches) */}
              <div className="relative" ref={videoBoxRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select a Video</label>
                <div
                  className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white cursor-text"
                  onClick={() => setVideoDropdownOpen(true)}
                >
                  {selectedVideoIds.map((idStr) => {
                    const match = videos.find((v) => String(v.id) === idStr);
                    const label = match ? match.title : idStr;
                    return (
                      <span
                        key={idStr}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoSelection(idStr);
                          }}
                          className="hover:text-blue-950"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={videoSearchInput}
                    onChange={(e) => {
                      setVideoSearchInput(e.target.value);
                      setVideoDropdownOpen(true);
                    }}
                    onFocus={() => setVideoDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredVideoOptions.length > 0) toggleVideoSelection(filteredVideoOptions[0].id);
                        setVideoDropdownOpen(false);
                      } else if (e.key === "Escape") {
                        setVideoDropdownOpen(false);
                      }
                    }}
                    placeholder={selectedVideoIds.length === 0 ? "Type to Search" : "Add another..."}
                    className="flex-1 min-w-[120px] outline-none text-sm py-0.5"
                  />
                </div>

                {videoDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {filteredVideoOptions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No videos found.</p>
                    ) : (
                      filteredVideoOptions.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            toggleVideoSelection(v.id);
                            setVideoDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          {v.title}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                {mode === "userSearch" && `Showing watch history for "${userSearch.trim()}" across all videos.`}
                {mode === "video" && "Showing watch details for the selected video."}
                {mode === "videos" && "Showing watch details for the selected videos."}
              </p>
              {selectedVideoIds.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    selectedVideoIds.length === 1 ? fetchAnalytics(selectedVideoIds[0]) : fetchVideosRows(selectedVideoIds)
                  }
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 self-start md:self-auto"
                >
                  Refresh analytics
                </button>
              )}
            </div>
          </div>

          {mode === "userSearch" && globalSearchMessages.length > 0 && (
            <div className="space-y-2 mb-6">
              {globalSearchMessages.map((msg, idx) =>
                dismissedGlobalMsgIndexes.has(idx) ? null : (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm"
                  >
                    <span>{msg}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedGlobalMsgIndexes((prev) => new Set(prev).add(idx))
                      }
                      className="shrink-0 text-amber-500 hover:text-amber-800"
                      aria-label="Dismiss message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {activeError && activeError !== dismissedActiveError && (
            <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-800 text-sm">
              <span>{activeError}</span>
              <button
                type="button"
                onClick={() => setDismissedActiveError(activeError)}
                className="shrink-0 text-amber-500 hover:text-amber-800"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeLoading && <p className="text-gray-500">Loading...</p>}

          {!activeLoading && mode !== "empty" && (
            <>
              {mode === "video" && selectedVideo && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex items-center justify-between gap-2 text-gray-500 text-sm mb-2">
                    <span>Selected video</span>
                    <span className="text-xs text-gray-400">
                      Last refreshed {lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN") : "-"}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-800">{selectedVideo.title}</p>
                  <p className="text-sm text-gray-500">Video ID: {selectedVideo.id}</p>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Desktop / tablet table (md and up) */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-7 gap-4 px-5 py-3 text-xs font-medium text-gray-500 border-b border-gray-200">
                    <span>User</span>
                    <span>Video</span>
                    <span>Views</span>
                    <span>Device Type</span>
                    <span>Watch Duration (s)</span>
                    <span>Started At</span>
                    <span>Ended At</span>
                  </div>
                  {filteredRows.map((row) => {
                    const isExpanded = expandedRowKey === row.key;
                    const rowViews = Array.isArray(row.views) ? row.views : [];
                    const firstView = rowViews[0] ?? null;
                    const lastView = rowViews[rowViews.length - 1] ?? null;
                    return (
                      <div key={row.key}>
                        <div
                          className="grid grid-cols-7 gap-4 px-5 py-3 items-center border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedRowKey(isExpanded ? null : row.key)}
                        >
                          <span className="text-sm text-gray-800 flex flex-col gap-1">
                            <span className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {row.user_name || "Unknown user"}
                            </span>
                            <span className="text-xs text-gray-500">ID: {row.user_id || "-"}</span>
                          </span>
                          <span className="text-sm text-gray-700">{row.video_title}</span>
                          <span className="text-sm text-gray-700">{rowViews.length}</span>
                          <span className="text-sm text-gray-700">{lastView?.device_type || firstView?.device_type || "Unknown"}</span>
                          <span className="text-sm text-gray-700">{lastView?.watch_duration_seconds ?? "-"}</span>
                          <span className="text-sm text-gray-700">{formatDate(firstView?.started_at)}</span>
                          <span className="text-sm text-gray-500">{formatDate(lastView?.ended_at)}</span>
                        </div>
                        {isExpanded && (
                          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 space-y-2">
                            {rowViews.map((view, idx) => (
                              <div
                                key={view.view_id ?? `${row.key}-${idx}`}
                                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600"
                              >
                                <div className="flex flex-wrap gap-3">
                                  <span className="text-gray-500">View {view.view_number ?? "#"}</span>
                                  <span>{formatDuration(view.watch_duration_seconds)} watched</span>
                                  <span className="text-gray-400">{formatDateTime(view.started_at)} → {formatDateTime(view.ended_at)}</span>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                  <span>Device: {view.device_type || "Unknown"}</span>
                                  {view.view_id && <span>View ID: {view.view_id}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      {activeRows.length === 0 ? "No views recorded yet." : "No users match your search."}
                    </p>
                  )}
                </div>

                {/* Mobile card layout (below md) */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredRows.map((row) => {
                    const isExpanded = expandedRowKey === row.key;
                    const rowViews = Array.isArray(row.views) ? row.views : [];
                    const firstView = rowViews[0] ?? null;
                    const lastView = rowViews[rowViews.length - 1] ?? null;
                    return (
                      <div key={row.key} className="p-4">
                        <div
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => setExpandedRowKey(isExpanded ? null : row.key)}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{row.user_name || "Unknown user"}</p>
                            <p className="text-xs text-gray-500">ID: {row.user_id || "-"}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                          <span className="text-gray-400">Video</span>
                          <span className="text-right">{row.video_title}</span>
                          <span className="text-gray-400">Views</span>
                          <span className="text-right">{rowViews.length}</span>
                          <span className="text-gray-400">Device Type</span>
                          <span className="text-right">{lastView?.device_type || firstView?.device_type || "Unknown"}</span>
                          <span className="text-gray-400">Watch Duration (s)</span>
                          <span className="text-right">{lastView?.watch_duration_seconds ?? "-"}</span>
                          <span className="text-gray-400">Started At</span>
                          <span className="text-right">{formatDate(firstView?.started_at)}</span>
                          <span className="text-gray-400">Ended At</span>
                          <span className="text-right">{formatDate(lastView?.ended_at)}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {rowViews.map((view, idx) => (
                              <div
                                key={view.view_id ?? `${row.key}-m-${idx}`}
                                className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1"
                              >
                                <p className="font-medium text-gray-700">View {view.view_number ?? "#"}</p>
                                <p>{formatDuration(view.watch_duration_seconds)} watched</p>
                                <p className="text-gray-400">{formatDateTime(view.started_at)} → {formatDateTime(view.ended_at)}</p>
                                <p>Device: {view.device_type || "Unknown"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <p className="text-center text-gray-500 py-8 text-sm px-4">
                      {activeRows.length === 0 ? "No views recorded yet." : "No users match your search."}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default VideoAnalytics;