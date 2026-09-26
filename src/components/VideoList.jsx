import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Video,
  Play,
  Clock,
  Users,
  ChevronDown,
  ChevronLeft,
  BarChart3,
  Search,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";
import AdminMobileNavBar from "./AdminMobileNavBar";

const VideoList = () => {
  const contentRef = useRef(null);
  const [videosByBatch, setVideosByBatch] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  // Which batch folder is currently open. null => show the folder grid.
  // Hydrated from the ?batch= URL param so that navigating to a video and
  // back returns here (to the folder's video list), not to the folder grid.
  const [openBatch, setOpenBatch] = useState(() => searchParams.get("batch"));

  // "Select a batch" searchable combobox
  const [batchQuery, setBatchQuery] = useState("");
  const [isBatchListOpen, setIsBatchListOpen] = useState(false);

  // "Select a video" searchable combobox (only relevant inside an open folder)
  const [videoQuery, setVideoQuery] = useState("");
  const [isVideoListOpen, setIsVideoListOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_URL;

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/videos/videosAll`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setVideosByBatch(data.videos);
        } else {
          setError("Error fetching videos: " + data.error);
        }
      } catch (error) {
        setError("Fetch error: " + error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [token, API_URL]);

  const batchKeys = Object.keys(videosByBatch);

  const handleBatchPick = (batch) => {
    // batch === null means "All Batches" -> back to the folder grid
    setOpenBatch(batch);
    setSearchParams(batch ? { batch } : {});
    setBatchQuery("");
    setIsBatchListOpen(false);
    setVideoQuery("");
    setSelectedVideoId(null);
    // Scrolling to a folder further down the grid shouldn't leave the
    // opened video list scrolled past its own top - reset the scroll
    // position of the content panel so the folder header/first video
    // is visible right away.
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  };

  const matchingBatches = batchKeys.filter((b) =>
    b.toLowerCase().includes(batchQuery.trim().toLowerCase())
  );

  const batchInputValue = isBatchListOpen
    ? batchQuery
    : openBatch
    ? `Batch ${openBatch}`
    : "All Batches";

  if (loading) return <Loading />;

  const currentBatchVideos = openBatch ? videosByBatch[openBatch] || [] : [];

  const matchingVideos = currentBatchVideos.filter((v) =>
    (v.title || "").toLowerCase().includes(videoQuery.trim().toLowerCase())
  );

  // What's actually shown in the grid below: narrows down to the search
  // results once the admin has typed something or picked a video from the
  // suggestions, otherwise the full batch.
  const displayedVideos = videoQuery.trim() ? matchingVideos : currentBatchVideos;

  const goToVideo = (video) => {
    // Selecting a video from search only shows/highlights it in the grid
    // below - it does NOT navigate. The admin still has to click the
    // video card itself to actually open it.
    setIsVideoListOpen(false);
    setVideoQuery(video.title || "");
    setSelectedVideoId(video.id);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div ref={contentRef} className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Course Videos
              </h1>
            </div>
            <p className="text-gray-600">
              {openBatch
                ? `Batch ${openBatch} · ${currentBatchVideos.length} video${
                    currentBatchVideos.length !== 1 ? "s" : ""
                  }`
                : "Browse all educational content by batch"}
            </p>
          </div>

          {/* Controls row: Select a video (only inside a folder) + Select a batch.
              One row on desktop/window screens, stacked on mobile. */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-end mb-6">
            <div className="relative w-full sm:w-80 sm:order-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Select a batch
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={batchInputValue}
                  onChange={(e) => setBatchQuery(e.target.value)}
                  onFocus={() => {
                    setIsBatchListOpen(true);
                    setBatchQuery("");
                  }}
                  onBlur={() =>
                    setTimeout(() => setIsBatchListOpen(false), 150)
                  }
                  placeholder="Type to search batches..."
                  autoComplete="off"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform pointer-events-none ${
                    isBatchListOpen ? "rotate-180" : ""
                  }`}
                />
              </div>

              {isBatchListOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleBatchPick(null)}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      !openBatch
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    All Batches
                  </button>
                  {matchingBatches.length > 0 ? (
                    matchingBatches.map((batch) => (
                      <button
                        type="button"
                        key={batch}
                        onClick={() => handleBatchPick(batch)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          openBatch === batch
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Batch {batch}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-400">
                      No matching batches
                    </div>
                  )}
                </div>
              )}
            </div>

            {openBatch && (
              <div className="relative w-full sm:flex-1 sm:order-1">
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
                          onClick={() => goToVideo(video)}
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
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}

          {batchKeys.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Videos Available
              </h3>
              <p className="text-gray-600">
                No videos have been uploaded yet. Check back later!
              </p>
            </div>
          ) : !openBatch ? (
            /* ---------------- FOLDER GRID (one folder per batch) ---------------- */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
              {batchKeys.map((batch) => {
                const count = videosByBatch[batch].length;
                return (
                  <button
                    key={batch}
                    onClick={() => handleBatchPick(batch)}
                    className="group flex flex-col items-center text-left focus:outline-none"
                  >
                    <div className="relative w-full aspect-square">
                      <img
                        src="/folder-icon.png"
                        alt=""
                        className="w-full h-full object-contain drop-shadow-sm group-hover:drop-shadow-lg group-hover:scale-[1.03] transition-all duration-300"
                      />
                      {/* video count badge */}
                      <span className="absolute top-1 right-1 bg-white/95 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm border border-blue-100">
                        {count} video{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-1 w-full text-center">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        Batch {batch}
                      </p>
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
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    if (videoQuery.trim() || selectedVideoId) {
                      // A video search/selection is active - just clear it
                      // and stay on this batch's full video list.
                      setVideoQuery("");
                      setSelectedVideoId(null);
                    } else {
                      // No search active - go back to the folder grid.
                      handleBatchPick(null);
                    }
                  }}
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
                  Batch {openBatch}
                </h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {currentBatchVideos.length} video
                  {currentBatchVideos.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {displayedVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer ${
                      video.id === selectedVideoId
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() =>
                      navigate("/video", {
                        state: { videoId: video.id, batch: openBatch },
                      })
                    }
                  >
                    {/* Thumbnail */}
                    <div className="relative h-40 sm:h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <img src="/thumnail.png" alt="" />
                      </div>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 rounded-full p-3">
                          <Play className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {video.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {/* <span>45 mins</span> */}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/video-analytics/${video.id}`);
                            }}
                            aria-label="View analytics"
                            title="View analytics"
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/video", {
                                state: { videoId: video.id, batch: openBatch },
                              });
                            }}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
                          >
                            Watch Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <AdminMobileNavBar scrollContainerRef={contentRef} />
    </div>
  );
};

export default VideoList;