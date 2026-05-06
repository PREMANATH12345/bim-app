import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Play, Clock, Users, ChevronDown } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";

const VideoList = () => {
  const [videosByBatch, setVideosByBatch] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all"); // 'all' will show all batches
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setIsDropdownOpen(false);
  };

  const filteredBatches =
    selectedBatch === "all" ? Object.keys(videosByBatch) : [selectedBatch];

  if (loading) return <Loading />;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Course Videos
              </h1>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                Browse all educational content by batch
              </p>

              {/* Batch Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedBatch === "all"
                    ? "All Batches"
                    : `Batch ${selectedBatch}`}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isDropdownOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleBatchSelect("all")}
                        className={`block px-4 py-2 text-sm w-full text-left ${
                          selectedBatch === "all"
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        All Batches
                      </button>
                      {Object.keys(videosByBatch).map((batch) => (
                        <button
                          key={batch}
                          onClick={() => handleBatchSelect(batch)}
                          className={`block px-4 py-2 text-sm w-full text-left ${
                            selectedBatch === batch
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          Batch {batch}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}

          {/* Video Content */}
          {Object.keys(videosByBatch).length > 0 ? (
            <div className="space-y-8">
              {filteredBatches.map((batch) => (
                <div
                  key={batch}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Batch {batch}
                    </h2>
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                      {videosByBatch[batch].length} videos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {videosByBatch[batch].map((video) => (
                      <div
                        key={video.id}
                        className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer"
                        onClick={() =>
                          navigate("/video", { state: { videoId: video.id } })
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/video", {
                                  state: { videoId: video.id },
                                });
                              }}
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
              ))}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoList;
