import React, { useEffect, useState } from "react";
import { Edit3, Save, X, Trash2, Video } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";
import toast from "react-hot-toast";


const EditVideoList = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editVideo, setEditVideo] = useState(null);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_URL;

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/videos/getAllVideo`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch videos");
      const data = await res.json();
      setVideos(data.videos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const saveEdit = async () => {
    if (!editVideo) return;

    try {
      const res = await fetch(`${API_URL}/videos/editVideo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editVideo),
      });

      const data = await res.json();
      alert(data.message);
      setEditVideo(null);
      fetchVideos();
    } catch (error) {
      toast.error("Error updating video: " + error);
    }
  };

  const deleteVideo = async (id) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/videos/deleteVideo/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      toast.success(data.message);
      fetchVideos();
    } catch (error) {
      toast.error("Error deleting video: " + error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Edit Videos
              </h1>
            </div>
            <p className="text-gray-600">Manage and update video content</p>
          </div>

          {loading && <Loading />}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}

          {/* Videos Table - Desktop */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Batch
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Video URL
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {videos.length > 0 ? (
                    videos.map((video) => (
                      <tr
                        key={video.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          {editVideo && editVideo.id === video.id ? (
                            <input
                              type="text"
                              value={editVideo.batch}
                              onChange={(e) =>
                                setEditVideo({
                                  ...editVideo,
                                  batch: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {video.batch}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editVideo && editVideo.id === video.id ? (
                            <input
                              type="text"
                              value={editVideo.title}
                              onChange={(e) =>
                                setEditVideo({
                                  ...editVideo,
                                  title: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <div className="font-medium text-gray-900">
                              {video.title}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editVideo && editVideo.id === video.id ? (
                            <textarea
                              value={editVideo.description}
                              onChange={(e) =>
                                setEditVideo({
                                  ...editVideo,
                                  description: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              rows={2}
                            />
                          ) : (
                            <div className="text-gray-600 text-sm max-w-xs truncate">
                              {video.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editVideo && editVideo.id === video.id ? (
                            <input
                              type="url"
                              value={editVideo.video_url}
                              onChange={(e) =>
                                setEditVideo({
                                  ...editVideo,
                                  video_url: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <a
                              href={video.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-xs block"
                            >
                              {video.video_url}
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editVideo && editVideo.id === video.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="Save"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={() => setEditVideo(null)}
                                className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditVideo(video)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => deleteVideo(video.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center">
                          <Video className="w-12 h-12 text-gray-300 mb-4" />
                          <p>No videos found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Videos List - Mobile */}
          <div className="md:hidden space-y-4">
            {videos.length > 0 ? (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {video.title}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        {video.batch}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {editVideo && editVideo.id === video.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditVideo(null)}
                            className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditVideo(video)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editVideo && editVideo.id === video.id ? (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editVideo.title}
                          onChange={(e) =>
                            setEditVideo({
                              ...editVideo,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Batch
                        </label>
                        <input
                          type="text"
                          value={editVideo.batch}
                          onChange={(e) =>
                            setEditVideo({
                              ...editVideo,
                              batch: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editVideo.description}
                          onChange={(e) =>
                            setEditVideo({
                              ...editVideo,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Video URL
                        </label>
                        <input
                          type="url"
                          value={editVideo.video_url}
                          onChange={(e) =>
                            setEditVideo({
                              ...editVideo,
                              video_url: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-600 text-sm mb-2">
                        {video.description}
                      </p>
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm block truncate"
                      >
                        {video.video_url}
                      </a>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No videos found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditVideoList;
