import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  BookOpen,
  Play,
  Clock,
  Award,
  ClipboardList,
  MessageSquare,
  LayoutDashboard,
  ChevronLeft,
  Users,
  Search,
  User,
  Send,
  Reply,
  Video,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileNavBar from "./MobileNavbar";

const cleanBatch = (batch) => String(batch ?? "").trim();
const normalizeBatches = (batches) => {
  let values = batches;

  if (typeof batches === "string") {
    try {
      const parsed = JSON.parse(batches);
      values = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      values = batches.split(",");
    }
  }

  if (!Array.isArray(values)) values = [values];

  return [
    ...new Set(
      values
        // Strip ANY stray [ ] " ' characters anywhere in the piece (not just
        // at the very start/end), since malformed/partial JSON splitting can
        // leave them in the middle of a piece too, e.g. `["3A/2025` or
        // `"1/2024"]`.
        .map((batch) => cleanBatch(batch).replace(/[\[\]"']/g, "").trim())
        .filter(Boolean)
    ),
  ];
};

const StudentDashboard = () => {
  const [videos, setVideos] = useState([]);
  const [userAccessVideo, setUserAccessVideo] = useState([]);
  const [fullAccessBatches, setFullAccessBatches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  // Messages tab has two views: the existing inbox ("inbox"), and the new
  // "Send a Query to Admin" screen ("query") — toggled by the button on the
  // right side of the Messages header.
  const [messagesView, setMessagesView] = useState("inbox");
  const [myQueries, setMyQueries] = useState([]);
  const [myQueriesLoading, setMyQueriesLoading] = useState(true);
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [sendingQuery, setSendingQuery] = useState(false);
  // "Completed" section on the Dashboard tab — videos the student has
  // watched all the way through (auto-marked by the player on end).
  const [completedVideos, setCompletedVideos] = useState([]);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [completedSearch, setCompletedSearch] = useState("");
  // Watch-time stats (unique videos watched + total seconds spent) for the
  // Dashboard tab's stat cards.
  const [watchStats, setWatchStats] = useState({
    uniqueVideosWatched: 0,
    totalWatchSeconds: 0,
  });
  const [watchStatsLoading, setWatchStatsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  // Which batch "folder" is currently open on the Courses page.
  // null => show the folder grid (one folder per batch).
  // Hydrated from the ?batch= URL param so that coming back from the video
  // player's back arrow reopens the same batch's video list instead of
  // resetting to the folder grid.
  const [openBatch, setOpenBatch] = useState(() => searchParams.get("batch"));

  // "Select a video" searchable combobox (only relevant inside an open
  // folder) — same pattern as the admin Videos page.
  const [videoQuery, setVideoQuery] = useState("");
  const [isVideoListOpen, setIsVideoListOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [registeredBatches, setRegisteredBatches] = useState([]);
  // Which section is shown below the welcome banner. Driven by the left
  // Sidebar (desktop) and the bottom MobileNavBar (mobile) — both just call
  // setActiveTab, nothing here changes routes.
  //
  // Initialized from sessionStorage (not a plain "dashboard" default) so that
  // when the video player's back arrow sends the user to "/student", this
  // component remounts on the same tab they left from (normally "courses")
  // instead of always resetting to Dashboard.
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("studentActiveTab") || "dashboard"
  );
  const contentRef = useRef(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_URL;

  // Resolve batch name or ID to batch ID (matching AdminDashboard logic)
  const getBatchId = (nameOrId) => {
    if (nameOrId == null || nameOrId === "") return "";
    const str = String(nameOrId).replace(/[\[\]"']/g, "").trim().toLowerCase();
    const found = batches.find(
      (b) =>
        String(b.id).trim().toLowerCase() === str ||
        String(b.name).trim().toLowerCase() === str
    );
    return found ? String(found.id) : String(nameOrId).trim();
  };

  // Resolve batch name or ID to batch Name (matching AdminDashboard logic)
  const getBatchName = (nameOrId) => {
    if (nameOrId == null || nameOrId === "") return "";
    const str = String(nameOrId).replace(/[\[\]"']/g, "").trim().toLowerCase();
    const found = batches.find(
      (b) =>
        String(b.id).trim().toLowerCase() === str ||
        String(b.name).trim().toLowerCase() === str
    );
    return found ? found.name : String(nameOrId).trim();
  };

  // Normalize batch value for matching (matching AdminDashboard logic)
  const normalizeBatchForMatch = (value) => {
    if (value == null || value === "") return [];
    let values = value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          values = Array.isArray(parsed) ? parsed : [trimmed];
        } catch {
          values = trimmed.split(",");
        }
      } else if (trimmed.includes(",")) {
        values = trimmed.split(",");
      } else {
        values = [trimmed];
      }
    }
    if (!Array.isArray(values)) values = [values];

    const result = new Set();
    values.forEach((v) => {
      if (!v) return;
      const str = String(v).replace(/[\[\]"']/g, "").trim();
      if (!str) return;
      result.add(str.toLowerCase());

      const bId = getBatchId(str);
      if (bId) result.add(String(bId).trim().toLowerCase());

      const bName = getBatchName(str);
      if (bName) result.add(String(bName).trim().toLowerCase());
    });

    return Array.from(result);
  };

  const isBatchInFullAccess = (batchNameOrId, fullBatches, userAccess = []) => {
    if (!fullBatches) {
      return !userAccess || userAccess.length === 0;
    }
    const fullList = normalizeBatches(fullBatches);
    if (fullList.length === 0) {
      return !userAccess || userAccess.length === 0;
    }

    const targetMatches = normalizeBatchForMatch(batchNameOrId);
    if (targetMatches.length === 0) return false;
    const targetSet = new Set(targetMatches);

    return fullList.some((fb) => {
      const fbMatches = normalizeBatchForMatch(fb);
      return fbMatches.some((m) => targetSet.has(m));
    });
  };

  // Get all videos for a batch (matching AdminDashboard logic)
  const getVideosForBatch = (batchValue, videoList = videos) => {
    if (!batchValue) return [];
    const targetMatches = normalizeBatchForMatch(batchValue);
    if (targetMatches.length === 0) return [];
    const targetSet = new Set(targetMatches);

    return videoList.filter((video) => {
      if (!video) return false;

      // 1. Check video.batch_id / video.batchId
      const vBatchId = video.batch_id ?? video.batchId;
      if (vBatchId != null && vBatchId !== "") {
        const vIdStr = String(vBatchId).trim().toLowerCase();
        if (targetSet.has(vIdStr)) return true;
      }

      // 2. Check video.batch / video.batch_name / video.batchName
      const rawVBatch = video.batch ?? video.batch_name ?? video.batchName;
      if (rawVBatch != null && rawVBatch !== "") {
        const vMatches = normalizeBatchForMatch(rawVBatch);
        if (vMatches.some((m) => targetSet.has(m))) {
          return true;
        }
      }

      return false;
    });
  };

  // Unique batch labels assigned to the student or available from fullAccessBatches / registeredBatches / userAccessVideo
  const studentBatchLabels = useMemo(() => {
    const userAccessSet = new Set(
      (Array.isArray(userAccessVideo) ? userAccessVideo : []).map((id) =>
        String(id)
      )
    );

    const videoAccessBatchLabels = videos
      .filter((v) => userAccessSet.has(String(v.id)))
      .flatMap((v) => normalizeBatches(v.batch));

    const rawList = [
      ...normalizeBatches(registeredBatches),
      ...normalizeBatches(fullAccessBatches),
      ...videoAccessBatchLabels,
    ];

    const labels = rawList
      .map((b) => getBatchName(b) || cleanBatch(b))
      .filter(Boolean);

    const unique = [...new Set(labels)];
    if (unique.length > 0) return unique;

    // Fallback: If user has no specific registered/full batches or access videos, return all video batch labels
    return [
      ...new Set(
        videos.flatMap((v) => normalizeBatches(v.batch).map((b) => getBatchName(b) || cleanBatch(b)))
      ),
    ].filter(Boolean);
  }, [registeredBatches, fullAccessBatches, userAccessVideo, videos, batches]);

  // Compute course groups per batch using AdminDashboard access rules
  const courseGroups = useMemo(() => {
    console.log("=== DEBUG STUDENT DASHBOARD ===");
    console.log("registeredBatches:", registeredBatches);
    console.log("fullAccessBatches:", fullAccessBatches);
    console.log("userAccessVideo:", userAccessVideo);
    console.log("Total videos from API:", videos.length);
    console.log("studentBatchLabels:", studentBatchLabels);

    const userAccessSet = new Set(
      (Array.isArray(userAccessVideo) ? userAccessVideo : []).map((id) =>
        String(id)
      )
    );

    const groups = studentBatchLabels
      .map((batchLabel) => {
        const allBatchVideos = getVideosForBatch(batchLabel, videos);
        const isFull = isBatchInFullAccess(
          batchLabel,
          fullAccessBatches,
          userAccessVideo
        );

        // If batch is in Full Access mode ("All Videos (Auto-new)"), student gets ALL videos for this batch.
        // Otherwise, student gets only checked videos from userAccessVideo.
        const accessibleVideos = isFull
          ? allBatchVideos
          : allBatchVideos.filter((v) => userAccessSet.has(String(v.id)));

        console.log(`[Batch Group] "${batchLabel}":`, {
          isFullAccess: isFull,
          totalVideosInBatch: allBatchVideos.length,
          accessibleVideosCount: accessibleVideos.length,
          videos: accessibleVideos.map((v) => ({ id: v.id, title: v.title, batch: v.batch })),
        });

        return {
          batch: batchLabel,
          videos: accessibleVideos,
        };
      });

    // Collect any extra videos specifically granted to student that are outside studentBatchLabels
    const groupedVideoIds = new Set(
      groups.flatMap((g) => g.videos.map((v) => String(v.id)))
    );

    const extraVideos = videos.filter(
      (v) => userAccessSet.has(String(v.id)) && !groupedVideoIds.has(String(v.id))
    );

    if (extraVideos.length > 0) {
      console.log("[Extra Videos outside assigned batch folders]:", extraVideos.length);
      const extraByBatch = new Map();
      extraVideos.forEach((v) => {
        const bName = getBatchName(v.batch) || cleanBatch(v.batch) || "Course Videos";
        if (!extraByBatch.has(bName)) extraByBatch.set(bName, []);
        extraByBatch.get(bName).push(v);
      });
      extraByBatch.forEach((vList, bName) => {
        const existingGroup = groups.find((g) => g.batch.toLowerCase() === bName.toLowerCase());
        if (existingGroup) {
          const existingIds = new Set(existingGroup.videos.map((v) => String(v.id)));
          vList.forEach((v) => {
            if (!existingIds.has(String(v.id))) existingGroup.videos.push(v);
          });
        } else {
          groups.push({ batch: bName, videos: vList });
        }
      });
    }

    console.log("Final Course Groups rendered:", groups);
    return groups;
  }, [studentBatchLabels, videos, fullAccessBatches, userAccessVideo, batches]);

  const filteredVideos = useMemo(
    () => courseGroups.flatMap((g) => g.videos),
    [courseGroups]
  );

  // Videos inside the currently open folder (null while on the folder grid).
  const currentGroupVideos = useMemo(
    () => courseGroups.find((group) => group.batch === openBatch)?.videos || [],
    [courseGroups, openBatch]
  );

  const handleBatchPick = (batch) => {
    // batch === null means "back to the folder grid"
    setOpenBatch(batch);
    setSearchParams(batch ? { batch } : {});
    setVideoQuery("");
    setIsVideoListOpen(false);
    setSelectedVideoId(null);
  };

  // Back arrow inside an open folder. If the admin has narrowed the list down
  // via "Select a video" (a search term typed in, or a single video picked),
  // the first press just clears that filter and shows the full video grid
  // for the current batch again. Only when nothing is filtered does it go
  // all the way back to the folder grid.
  const handleBackArrow = () => {
    if (videoQuery || selectedVideoId) {
      setVideoQuery("");
      setIsVideoListOpen(false);
      setSelectedVideoId(null);
      return;
    }
    handleBatchPick(null);
  };

  const matchingVideos = currentGroupVideos.filter((v) =>
    (v.title || "").toLowerCase().includes(videoQuery.trim().toLowerCase())
  );

  // What's actually shown in the grid: narrows to search results once the
  // student has typed something or picked a suggestion, otherwise the full
  // batch — same behavior as the admin Videos page.
  const displayedVideos = videoQuery.trim() ? matchingVideos : currentGroupVideos;

  const goToVideoSuggestion = (video) => {
    // Selecting a video from search only highlights it in the grid below -
    // it does NOT navigate. The student still clicks the card to open it.
    setIsVideoListOpen(false);
    setVideoQuery(video.title || "");
    setSelectedVideoId(video.id);
  };

  // Keep sessionStorage in sync so a remount (e.g. returning from /video)
  // knows which tab to restore.
  useEffect(() => {
    sessionStorage.setItem("studentActiveTab", activeTab);
  }, [activeTab]);

useEffect(() => {
  // Fetch videos and the student's own access info (batch, accessVideo,
  // fullAccessBatches) in parallel. Access info now comes from a dedicated
  // endpoint (/users/me/access) that ALWAYS returns clean, safely-parsed
  // arrays from the backend — no more guessing/parsing JSON strings on the
  // frontend, which is what caused "All Videos (Auto-new)" batches to miss
  // newly added videos when fullAccessBatches wasn't parsed consistently.
  const fetchVideosAndAccess = async () => {
    try {
      const [videosRes, accessRes] = await Promise.all([
        fetch(`${API_URL}/videos/getAllVideo`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) =>
            r.ok
              ? r
              : fetch(`${API_URL}/videos/videos`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
          )
          .catch(() =>
            fetch(`${API_URL}/videos/videos`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          ),
        fetch(`${API_URL}/users/me/access`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      const videosData = videosRes && videosRes.ok ? await videosRes.json() : null;
      const accessData = accessRes && accessRes.ok ? await accessRes.json() : null;

      if (videosRes.ok) {
        let extractedVideos = [];
        if (Array.isArray(videosData)) {
          extractedVideos = videosData;
        } else if (Array.isArray(videosData?.videos)) {
          extractedVideos = videosData.videos;
        } else if (videosData?.videos && typeof videosData.videos === "object") {
          extractedVideos = Object.entries(videosData.videos).flatMap(
            ([batchKey, videoList]) => {
              const list = Array.isArray(videoList) ? videoList : [];
              return list.map((v) => ({
                ...v,
                batch: v?.batch || batchKey,
              }));
            }
          );
        } else if (Array.isArray(videosData?.data)) {
          extractedVideos = videosData.data;
        }
        setVideos(extractedVideos);
      } else {
        console.error("Error fetching videos:", videosData.error);
      }

      let decodedToken = null;
      if (token) {
        try {
          decodedToken = jwtDecode(token);
        } catch (e) {
          console.warn("Error decoding token:", e);
        }
      }

      if (accessRes && accessRes.ok && accessData) {
        // These arrive already safely parsed from the backend (safeParse),
        // but we still guard with Array.isArray as a defensive fallback.
        setUserAccessVideo(normalizeBatches(accessData.accessVideo));
        setFullAccessBatches(normalizeBatches(accessData.fullAccessBatches));

        const apiBatches = normalizeBatches(accessData.batch);
        if (apiBatches.length) setRegisteredBatches(apiBatches);
      } else {
        // Fallback: try to salvage access info from the videos response
        // itself or the decoded token.
        console.warn(
          "Could not load /users/me/access — falling back to /videos/videos payload and token for access info."
        );
        const rawAccess =
          videosData?.accessVideo ??
          videosData?.user?.accessVideo ??
          videosData?.user?.access_video ??
          decodedToken?.accessVideo;

        const rawFull =
          videosData?.fullAccessBatches ??
          videosData?.user?.fullAccessBatches ??
          decodedToken?.fullAccessBatches;

        const rawBatches =
          videosData?.batches ??
          videosData?.user?.batches ??
          videosData?.user?.batch ??
          videosData?.batch ??
          decodedToken?.batch;

        setUserAccessVideo(normalizeBatches(rawAccess));
        setFullAccessBatches(normalizeBatches(rawFull));

        const apiBatches = normalizeBatches(rawBatches);
        if (apiBatches.length) setRegisteredBatches(apiBatches);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  fetchVideosAndAccess();
}, [token]);

  // Fetch batches for batch ID <-> name resolution
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch(`${API_URL}/batches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          const rawBatches = Array.isArray(data?.batches)
            ? data.batches
            : Array.isArray(data)
              ? data
              : [];
          setBatches(
            rawBatches
              .map((b) => {
                if (!b) return null;
                if (typeof b === "string") {
                  const name = b.trim();
                  return name ? { id: name, name } : null;
                }
                const name = b.name || b.batch_name || b.batch || b.label;
                return name && String(name).trim()
                  ? {
                      id: b.id != null ? String(b.id) : String(name).trim(),
                      name: String(name).trim(),
                    }
                  : null;
              })
              .filter(Boolean)
          );
        }
      } catch (err) {
        console.error("Error fetching batches in student dashboard:", err);
      }
    };

    fetchBatches();
  }, [token, API_URL]);

  // Fetch messages sent to me (broadcast to everyone, to my batch, or to me
  // directly) - shown on the Messages tab.
  useEffect(() => {
    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const response = await fetch(`${API_URL}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        } else {
          console.error("Error fetching messages:", data.error);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [token]);

  // Fetch my own submitted queries (with any admin reply) - shown on the
  // Query view of the Messages tab. Only fetched once the student actually
  // opens that view, and re-fetched whenever a new query is sent.
  const fetchMyQueries = async () => {
    setMyQueriesLoading(true);
    try {
      const response = await fetch(`${API_URL}/messages/queries/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMyQueries(Array.isArray(data.queries) ? data.queries : []);
      } else {
        console.error("Error fetching my queries:", data.error);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setMyQueriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "messages" && messagesView === "query") {
      fetchMyQueries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, messagesView, token]);

  // Fetch the student's completed videos for the Dashboard tab's
  // "Completed" section.
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const fetchCompletedVideos = async () => {
      setCompletedLoading(true);
      try {
        const response = await fetch(`${API_URL}/videos/completed/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setCompletedVideos(Array.isArray(data.videos) ? data.videos : []);
        } else {
          console.error("Error fetching completed videos:", data.error);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setCompletedLoading(false);
      }
    };
    fetchCompletedVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  // Fetch unique-videos-watched + total-time-spent stats for the Dashboard
  // tab's stat cards.
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const fetchWatchStats = async () => {
      setWatchStatsLoading(true);
      try {
        const response = await fetch(`${API_URL}/videos/my-watch-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setWatchStats({
            uniqueVideosWatched: data.uniqueVideosWatched || 0,
            totalWatchSeconds: data.totalWatchSeconds || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching watch stats:", error);
      } finally {
        setWatchStatsLoading(false);
      }
    };
    fetchWatchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  // Turns total seconds into a compact "2h 15m" / "45m" style label for the
  // "Total Time Spent" stat card.
  const formatWatchTime = (totalSeconds) => {
    const totalMinutes = Math.round((totalSeconds || 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const filteredCompletedVideos = completedVideos.filter((v) => {
    const q = completedSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (v.title || "").toLowerCase().includes(q) ||
      (v.course_name || "").toLowerCase().includes(q) ||
      (v.batch || "").toLowerCase().includes(q)
    );
  });

  const handleSendQuery = async () => {
    if (!queryMessage.trim()) {
      toast.error("Please enter your query");
      return;
    }
    setSendingQuery(true);
    try {
      const res = await fetch(`${API_URL}/messages/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: querySubject.trim(),
          message: queryMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send query");
      }
      toast.success("Query sent!");
      setQuerySubject("");
      setQueryMessage("");
      fetchMyQueries();
    } catch (err) {
      toast.error(err.message || "Failed to send query");
    } finally {
      setSendingQuery(false);
    }
  };

  // Show a red dot on the bell whenever a message arrived after the last
  // time this student opened the Messages tab. "Seen" is remembered per
  // user (not per message) via localStorage, so it survives page reloads.
  useEffect(() => {
    if (messagesLoading || messages.length === 0) return;
    try {
      const userId = jwtDecode(token)?.id;
      const latest = messages.reduce((max, m) => {
        const t = m.created_at ? new Date(m.created_at).getTime() : 0;
        return t > max ? t : max;
      }, 0);
      const lastSeen = Number(localStorage.getItem(`messagesLastSeen_${userId}`)) || 0;
      setHasUnreadMessages(latest > lastSeen);
    } catch {
      // ignore - unread indicator is best-effort only
    }
  }, [messages, messagesLoading, token]);

  // Once the student actually opens the Messages tab, mark everything as
  // seen so the red dot goes away (and stays away on refresh, until the
  // next new message arrives).
  useEffect(() => {
    if (activeTab !== "messages" || messages.length === 0) return;
    try {
      const userId = jwtDecode(token)?.id;
      const latest = messages.reduce((max, m) => {
        const t = m.created_at ? new Date(m.created_at).getTime() : 0;
        return t > max ? t : max;
      }, 0);
      localStorage.setItem(`messagesLastSeen_${userId}`, String(latest));
      setHasUnreadMessages(false);
    } catch {
      // ignore - unread indicator is best-effort only
    }
  }, [activeTab, messages, token]);

  const comingSoonLabel = {
    dashboard: "Dashboard",
    assignments: "Assignments",
    certificates: "Certificates",
    messages: "Messages",
  };

  // What the TopBar title should read for each tab. Courses shows "Videos"
  // there specifically, per request — everything else just uses its own name.
  const topBarTitle = {
    dashboard: "Dashboard",
    courses: "Videos",
    assignments: "Assignments",
    certificates: "Certificates",
    messages: "Messages",
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role="student"
        activeSection={activeTab}
        onSectionChange={setActiveTab}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={topBarTitle[activeTab]}
          hasUnread={hasUnreadMessages}
          onBellClick={() => setActiveTab("messages")}
        />

        {/* pb-24 leaves room for the fixed MobileNavBar on small screens */}
        <div ref={contentRef} className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
          {activeTab === "courses" ? (
            <>
              {/* Welcome banner + stats — only shown on the Courses page */}
              <div className="mb-8">
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 rounded-2xl p-6 lg:p-8 text-white overflow-hidden">
                  {/* Available Videos — pinned to the top-right corner of the banner,
                      but ONLY on window/desktop screens (sm and up). On mobile this
                      is hidden here and shown below instead, in its original
                      full-width stacked layout. */}
                  <div className="hidden sm:flex absolute top-6 right-6 items-center gap-2 bg-white/10 rounded-lg px-4 py-2.5 backdrop-blur-sm">
                    <Play className="w-5 h-5 text-blue-200 shrink-0" />
                    <div>
                      <p className="text-xs text-blue-200 leading-tight whitespace-nowrap">Available Videos</p>
                      <p className="text-xl font-bold leading-tight">{videos.length}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:pr-32">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold">Welcome to Your Learning Journey</h1>
                      <p className="text-blue-100 mt-1">Continue your progress and master new skills</p>
                    </div>
                  </div>

                  {/* Mobile-only: Available Videos in its original full-width row,
                      stacked below the title. Hidden on sm and up (replaced by the
                      corner badge above). */}
                  <div className="sm:hidden w-full flex items-center gap-3 bg-white/10 rounded-lg px-6 py-4 backdrop-blur-sm mt-4">
                    <Play className="w-6 h-6 text-blue-200" />
                    <div>
                      <p className="text-sm text-blue-200 leading-tight">Available Videos</p>
                      <p className="text-2xl font-bold leading-tight">{videos.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Content */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {openBatch
                    ? (openBatch === "Course Videos" ? openBatch : `Batch ${openBatch}`)
                    : "Your Course Videos"}
                </h2>

                {videos.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Videos Available</h3>
                    <p className="text-gray-600">No videos are currently available for this batch. Check back later!</p>
                  </div>
                ) : !openBatch ? (
                  /* ---------------- FOLDER GRID (one folder per batch) ---------------- */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
                    {courseGroups.map((group) => {
                      const count = group.videos.length;
                      const label = group.batch === "Course Videos" ? group.batch : `Batch ${group.batch}`;
                      return (
                        <button
                          key={group.batch}
                          onClick={() => handleBatchPick(group.batch)}
                          className="group flex flex-col items-center text-left focus:outline-none"
                        >
                          <div className="relative w-full aspect-square">
                            <img
                              src="/folder-icon.png"
                              alt=""
                              className="w-full h-full object-contain drop-shadow-sm group-hover:drop-shadow-lg group-hover:scale-[1.03] transition-all duration-300"
                            />
                            <span className="absolute top-1 right-1 bg-white/95 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm border border-blue-100">
                              {count} video{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="mt-1 w-full text-center">
                            <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
                            <p className="text-xs text-gray-500">
                              {count} video{count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* ---------------- VIDEOS INSIDE THE OPEN FOLDER ---------------- */
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={handleBackArrow}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                          aria-label="Back"
                          title="Back"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">
                          {openBatch === "Course Videos" ? openBatch : `Batch ${openBatch}`}
                        </h2>
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                          {currentGroupVideos.length} video
                          {currentGroupVideos.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Select a video — same searchable combobox as the admin Videos page */}
                      <div className="relative w-full sm:w-72">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Select a video
                        </label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={videoQuery}
                            onChange={(e) => {
                              setVideoQuery(e.target.value);
                              setSelectedVideoId(null);
                            }}
                            onFocus={() => setIsVideoListOpen(true)}
                            onBlur={() =>
                              setTimeout(() => setIsVideoListOpen(false), 150)
                            }
                            placeholder='e.g. "Revit API with Python"'
                            autoComplete="off"
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {isVideoListOpen && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {matchingVideos.length > 0 ? (
                              matchingVideos.map((video) => (
                                <button
                                  key={video.id}
                                  type="button"
                                  onClick={() => goToVideoSuggestion(video)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 truncate"
                                >
                                  {video.title}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-400">
                                No matching videos in this batch
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayedVideos.map((video) => (
                        <div
                          key={video.id}
                          className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group ${
                            video.id === selectedVideoId ? "ring-2 ring-blue-500" : ""
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                            <img
                              src="https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800"
                              alt="Video Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-white/90 rounded-full p-3">
                                <Play className="w-8 h-8 text-blue-600" />
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                              {video.title}
                            </h3>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                              {video.description}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>45 mins</span>
                              </div>
                              <button
                                onClick={() =>
                                  navigate("/video", { state: { videoId: video.id, batch: openBatch } })
                                }
                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
                              >
                                Watch Now
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "messages" ? (
            /* ---------------- MESSAGES ---------------- */
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMessagesView("inbox")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      messagesView === "inbox"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Inbox
                  </button>
                  <button
                    onClick={() => setMessagesView("query")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      messagesView === "query"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Query
                  </button>
                </div>
              </div>

              {messagesView === "query" ? (
                /* ---------------- SEND A QUERY TO ADMIN ---------------- */
                <>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                      Send a Query to Admin
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject (optional)
                      </label>
                      <input
                        type="text"
                        value={querySubject}
                        onChange={(e) => setQuerySubject(e.target.value)}
                        placeholder="What's this about?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Query
                      </label>
                      <textarea
                        value={queryMessage}
                        onChange={(e) => setQueryMessage(e.target.value)}
                        placeholder="Type your question for the admin..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSendQuery}
                      disabled={sendingQuery}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      <Send size={16} />
                      {sendingQuery ? "Sending..." : "Send Query"}
                    </button>
                  </div>

                  <h3 className="text-base font-semibold text-gray-800 mb-3">My Queries</h3>
                  {myQueriesLoading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500 text-sm">
                      Loading your queries...
                    </div>
                  ) : myQueries.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-500">
                        You haven't sent any queries yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myQueries.map((q) => (
                        <div
                          key={q.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400 ml-auto">
                              {q.created_at ? new Date(q.created_at).toLocaleString() : ""}
                            </span>
                          </div>
                          {q.subject && (
                            <p className="text-sm font-bold text-gray-800">{q.subject}</p>
                          )}
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                            {q.message}
                          </p>
                          {q.reply && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                              <div className="flex items-center gap-1 mb-1">
                                <Reply size={12} className="text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700">
                                  Admin Reply
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {q.reply}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : messagesLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No Messages Yet</h3>
                  <p className="text-gray-600">You'll see messages from your instructor here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800">
                              {msg.created_by || "Admin"}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                              {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                            </span>
                          </div>
                          {msg.heading && (
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{msg.heading}</p>
                          )}
                          <p className="text-sm text-gray-600 whitespace-pre-wrap mt-0.5">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "dashboard" ? (
            /* ---------------- DASHBOARD: STATS + COMPLETED VIDEOS ---------------- */
            <div className="w-full">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {[
                  {
                    label: "Available Courses",
                    value: courseGroups.length,
                    icon: BookOpen,
                    iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
                    loading: false,
                  },
                  {
                    label: "Available Videos",
                    value: videos.length,
                    icon: Video,
                    iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
                    loading: false,
                  },
                  {
                    label: "Videos Watched",
                    value: watchStats.uniqueVideosWatched,
                    icon: Eye,
                    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
                    loading: watchStatsLoading,
                  },
                  {
                    label: "Time Spent",
                    value: formatWatchTime(watchStats.totalWatchSeconds),
                    icon: Clock,
                    iconBg: "bg-gradient-to-br from-orange-500 to-pink-500",
                    loading: watchStatsLoading,
                    isText: true,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className={`inline-flex p-2.5 rounded-xl text-white shadow-md ${stat.iconBg}`}>
                      <stat.icon size={18} />
                    </div>
                    <h3 className="text-gray-500 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mt-3">
                      {stat.label}
                    </h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
                      {stat.loading ? (
                        <span className="inline-block h-6 w-12 bg-gray-100 rounded animate-pulse" />
                      ) : stat.isText ? (
                        stat.value
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4">Completed Videos</h2>

              <div className="relative mb-5">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                  placeholder="Search completed videos or course name..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {completedLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 text-sm">
                  Loading your completed videos...
                </div>
              ) : completedVideos.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    No completed videos yet
                  </h3>
                  <p className="text-gray-600">
                    Videos you watch all the way through will show up here.
                  </p>
                </div>
              ) : filteredCompletedVideos.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No completed videos match "{completedSearch}".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCompletedVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() =>
                        navigate("/video", {
                          state: { videoId: video.id, batch: video.batch },
                        })
                      }
                      className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-left hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-32 bg-gradient-to-br from-emerald-500 to-teal-600 overflow-hidden shrink-0">
                        <img
                          src="https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800"
                          alt=""
                          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/90 rounded-full p-2.5">
                            <Play size={16} className="text-emerald-600" />
                          </div>
                        </div>
                        {/* Completed ribbon */}
                        <span className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                          <Award size={11} />
                          Done
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1 p-4">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                          {video.title}
                        </p>
                        {(video.course_name || video.batch) && (
                          <span className="inline-block w-fit bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5 rounded-full mb-2">
                            {video.course_name || `Batch ${video.batch}`}
                          </span>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            Completed
                          </span>
                          <span>
                            {video.completed_at
                              ? new Date(video.completed_at).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Assignments / Certificates — just the TopBar above,
            // everything else cut and replaced with a simple "Coming soon"
            // placeholder.
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[60vh]">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {activeTab === "assignments" && <ClipboardList className="w-8 h-8 text-gray-400" />}
                {activeTab === "certificates" && <Award className="w-8 h-8 text-gray-400" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {comingSoonLabel[activeTab]}
              </h3>
              <p className="text-gray-600">Coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only bottom tab bar */}
      <MobileNavBar
        activeSection={activeTab}
        onSectionChange={setActiveTab}
        scrollContainerRef={contentRef}
      />
    </div>
  );
};

export default StudentDashboard;