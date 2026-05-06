import React, { useState, useEffect } from "react";
import {
  Upload,
  Video,
  FileText,
  Hash,
  Link,
  Edit3,
  Save,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ChevronDown,
  Eye,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";
import toast from "react-hot-toast";
import { QuizSelectorModal } from "./QuizSelectorModal";
// Modal component
const Modal = ({ isOpen, onClose, title, icon, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                {icon}
              </div>
              <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};


const UploadVideo = () => {

  // state for quiz dropdown
  const [showQuizSelector, setShowQuizSelector] = useState(false);



  // State for video list
  const [allVideos, setAllVideos] = useState([]); // Stores all videos from API
  const [filteredVideos, setFilteredVideos] = useState([]); // Stores filtered videos for display
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // State for modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [uploadFormData, setUploadFormData] = useState({
    batch: "",
    title: "",
    videoUrl: "",
    description: "",
    quiz_id: "", // NEW: Add this line

  });

  const [editFormData, setEditFormData] = useState({
    id: "",
    batch: "",
    title: "",
    video_url: "",
    description: "",
    quiz_id: "", // NEW: Add this line
  });

  // Search, filter and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(10); // Number of videos per page
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // NEW: State for quizzes 
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_URL;

  // Fetch all videos
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
      setAllVideos(data.videos || []);
      setFilteredVideos(data.videos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // NEW: Add this entire function after fetchVideos
  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const res = await fetch(`${API_URL}/videos/quizzes-dropdown`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch quizzes");
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchQuizzes(); // NEW: Add this line
  }, []);

  // Filter videos based on search term and batch filter
  useEffect(() => {
    let filtered = [...allVideos];

    // Apply search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply batch filter
    if (selectedBatch !== "all") {
      filtered = filtered.filter((video) => video.batch === selectedBatch);
    }

    setFilteredVideos(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, selectedBatch, allVideos]);

  // Get unique batches for filter dropdown
  const getUniqueBatches = () => {
    const batches = new Set(allVideos.map((video) => video.batch));
    return Array.from(batches).sort();
  };

  // Handle upload form changes
  const handleUploadChange = (e) => {
    const { name, value } = e.target;
    setUploadFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle video upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (
      !uploadFormData.batch ||
      !uploadFormData.title ||
      !uploadFormData.videoUrl ||
      !uploadFormData.description
    ) {
      toast.error("Please fill in all fields.");
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append("batch", uploadFormData.batch);
    dataToSend.append("video", uploadFormData.videoUrl);
    dataToSend.append("title", uploadFormData.title);
    dataToSend.append("description", uploadFormData.description);
    dataToSend.append("quiz_id", uploadFormData.quiz_id || ""); // NEW: Add this line


    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/videos/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: dataToSend,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Video uploaded successfully!");
        setUploadFormData({
          batch: "",
          title: "",
          videoUrl: "",
          description: "",
        });
        setShowUploadModal(false);
        fetchVideos(); // Refresh the video list
      } else {
        toast.error("Error uploading video: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      toast.error("Error uploading video: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal with video data
  const openEditModal = (video) => {
    setEditFormData({
      id: video.id,
      batch: video.batch,
      title: video.title,
      video_url: video.video_url,
      description: video.description,
      quiz_id: video.quiz_id || "", // NEW: Add this line
    });
    setShowEditModal(true);
  };

  // Save edited video
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.id) return;

    try {
      const res = await fetch(`${API_URL}/videos/editVideo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      toast.success(data.message);
      setShowEditModal(false);
      fetchVideos(); // Refresh the video list
    } catch (error) {
      toast.error("Error updating video: " + error);
    }
  };

  // Delete video
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
      fetchVideos(); // Refresh the video list
    } catch (error) {
      toast.error("Error deleting video: " + error);
    }
  };

  // Pagination logic
  const indexOfLastVideo = currentPage * videosPerPage;
  const indexOfFirstVideo = indexOfLastVideo - videosPerPage;
  const currentVideos = filteredVideos.slice(
    indexOfFirstVideo,
    indexOfLastVideo
  );
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // Maximum number of page buttons to show

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Calculate start and end pages
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're at the beginning or end
      if (currentPage <= 3) {
        endPage = 4;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      // Add ellipsis if needed
      if (startPage > 2) {
        pageNumbers.push("...");
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push("...");
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  // // Modal component
  // const Modal = ({ isOpen, onClose, title, icon, children }) => {
  //   if (!isOpen) return null;

  //   return (
  //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  //       <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
  //         <div className="p-6">
  //           <div className="flex justify-between items-center mb-6">
  //             <div className="flex items-center gap-3">
  //               <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
  //                 {icon}
  //               </div>
  //               <h2 className="text-xl font-bold text-gray-800">{title}</h2>
  //             </div>
  //             <button
  //               onClick={onClose}
  //               className="text-gray-500 hover:text-gray-700"
  //             >
  //               <X className="w-6 h-6" />
  //             </button>
  //           </div>
  //           {children}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                  Video Management
                </h1>
              </div>
              <p className="text-gray-600">Manage and update video content</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Video
            </button>
          </div>

          {/* Filters Section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search videos..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Batch Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Batches</option>
                {getUniqueBatches().map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>

            {/* Items Per Page Selector */}
            <div className="relative">
              <select
                value={videosPerPage}
                onChange={(e) => {
                  setVideosPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    Show {size} items
                  </option>
                ))}
              </select>
            </div>
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
                    {/* // MODIFY: Add Quiz column in your table header (around line with "Video URL" header) */}
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Quiz
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentVideos.length > 0 ? (
                    currentVideos.map((video) => (
                      <tr
                        key={video.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {video.batch}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {video.title}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 text-sm max-w-xs truncate">
                            {video.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-xs block"
                          >
                            {video.video_url}
                          </a>
                        </td>
                        {/* hmark--------------------- */}
                        {/* // NEW: Add this table cell after the Video URL cell */}
                        <td className="px-6 py-4">
                          {video.quiz ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {video.quiz.title}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">No Quiz</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(video)}
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

            {/* Pagination */}
            {filteredVideos.length > videosPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstVideo + 1}</span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastVideo, filteredVideos.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{filteredVideos.length}</span>{" "}
                  videos
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        typeof page === "number" ? setCurrentPage(page) : null
                      }
                      disabled={page === "..."}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Videos List - Mobile */}
          <div className="md:hidden space-y-4">
            {currentVideos.length > 0 ? (
              currentVideos.map((video) => (
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
                      <button
                        onClick={() => openEditModal(video)}
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
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    {video.description}
                  </p>
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm truncate overflow-hidden whitespace-nowrap w-[200px] block"
                  >
                    {video.video_url}
                  </a>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No videos found</p>
              </div>
            )}

            {/* Pagination for mobile */}
            {filteredVideos.length > videosPerPage && (
              <div className="flex flex-col items-center mt-6 space-y-4">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstVideo + 1}</span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastVideo, filteredVideos.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{filteredVideos.length}</span>{" "}
                  videos
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="w-20 h-10 pl-2 pr-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <option key={page} value={page}>
                          {page}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Video Modal */}
      <Modal
        key="upload-modal"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload New Video"
        icon={<Upload className="w-6 h-6 text-white" />}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Batch Number */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4" />
              Batch Number
            </label>
            <input
              type="text"
              name="batch"
              value={uploadFormData.batch}
              onChange={handleUploadChange}
              placeholder="Enter batch number (e.g., 2024-01)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Video className="w-4 h-4" />
              Video Title
            </label>
            <input
              type="text"
              name="title"
              value={uploadFormData.title}
              onChange={handleUploadChange}
              placeholder="Enter video title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              name="description"
              value={uploadFormData.description}
              onChange={handleUploadChange}
              placeholder="Enter video description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              required
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Link className="w-4 h-4" />
              Video URL
            </label>
            <input
              type="url"
              name="videoUrl"
              value={uploadFormData.videoUrl}
              onChange={handleUploadChange}
              placeholder="https://example.com/video.mp4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a direct link to the video file or streaming URL
            </p>
          </div>
          {/* hmark---------- */}
          {/* NEW: Add this entire Quiz dropdown section after Video URL field */}
          {/* quiz */}
          {/* FIXED: Quiz dropdown section */}
          {/* FIXED: Remove extra hyphens */}
          {/* <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Quiz (Optional)
            </label>
            <select 
              name="quiz_id"
              value={uploadFormData.quiz_id}
              onChange={handleUploadChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              disabled={loadingQuizzes}
            >
              <option value="">Select a quiz (optional)</option>
              {quizzes.map((quiz) => (
                <option key={quiz.quiz_id} value={quiz.quiz_id}>
                  {quiz.title} 
                </option>
              ))}
            </select>
          </div> */}
          {/* hmark-------- quiz dropdown  start*/}
          {/* <button 
      type="button"
      onClick={() => setShowQuizSelector(true)}
      className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg bg-white text-left"
    >
      Select Quiz
      <ChevronDown className="w-5 h-5 text-gray-500" />
    </button> */}
          <button
            type="button"
            onClick={() => setShowQuizSelector(true)}
            className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg bg-white text-left"
          >
            <span>
              {uploadFormData.quiz_id
                ? quizzes.find(q => q.quiz_id === uploadFormData.quiz_id)?.title || "Selected Quiz"
                : "Browse available quizzes (optional)"
              }
            </span>
            <Eye className="w-5 h-5 text-gray-500" />
          </button>

          {/* hmark-------- quiz dropdown end */}
          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Video
                </div>
              )}
            </button>
          </div>
        </form>
        {/* <QuizSelectorModal
  isOpen={showQuizSelector}
  onClose={() => setShowQuizSelector(false)}
  quizzes={quizzes}
  selectedQuizId={uploadFormData.quiz_id}
  onSelect={(quizId) => {
    setUploadFormData({...uploadFormData, quiz_id: quizId});
    setShowQuizSelector(false);
  }}
/> */}
      </Modal>

      {/* Edit Video Modal */}
      <Modal
        key="edit-modal"
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Video"
        icon={<Edit3 className="w-6 h-6 text-white" />}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* Batch Number */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4" />
              Batch Number
            </label>
            <input
              type="text"
              name="batch"
              value={editFormData.batch}
              onChange={handleEditChange}
              placeholder="Enter batch number (e.g., 2024-01)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Video className="w-4 h-4" />
              Video Title
            </label>
            <input
              type="text"
              name="title"
              value={editFormData.title}
              onChange={handleEditChange}
              placeholder="Enter video title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              name="description"
              value={editFormData.description}
              onChange={handleEditChange}
              placeholder="Enter video description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              required
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Link className="w-4 h-4" />
              Video URL
            </label>
            <input
              type="url"
              name="video_url"
              value={editFormData.video_url}
              onChange={handleEditChange}
              placeholder="https://example.com/video.mp4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>


          {/* FIXED: Quiz dropdown for edit modal */}
          {/* <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Quiz (Optional)
            </label>
            <select
              name="quiz_id"
              value={editFormData.quiz_id}
              onChange={handleEditChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              disabled={loadingQuizzes}
            >
              <option value="">Select a quiz (optional)</option>
              {quizzes.map((quiz) => (
                <option key={quiz.quiz_id} value={quiz.quiz_id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div> */}

          {/* Quiz Selector */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Quiz (Optional)
            </label>
            <button
              type="button"
              onClick={() => setShowQuizSelector(true)}
              className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg bg-white text-left"
            >
              <span>
                {editFormData.quiz_id
                  ? quizzes.find(q => q.quiz_id === editFormData.quiz_id)?.title || "Selected Quiz"
                  : "Select a quiz (optional)"
                }
              </span>
              <Eye className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Changes
                </div>
              )}
            </button>
            {/* <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium"
            >
              Cancel
            </button> */}
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
      {/* Quiz Selector Modal - Shared between both forms */}
      <QuizSelectorModal
        isOpen={showQuizSelector}
        onClose={() => setShowQuizSelector(false)}
        selectedQuizId={showEditModal ? editFormData.quiz_id : uploadFormData.quiz_id}
        onSelect={(quizId) => {
          if (showEditModal) {
            setEditFormData({ ...editFormData, quiz_id: quizId });
          } else {
            setUploadFormData({ ...uploadFormData, quiz_id: quizId });
          }
          setShowQuizSelector(false);
        }}
      />
    </div>
  );
};

export default UploadVideo;

