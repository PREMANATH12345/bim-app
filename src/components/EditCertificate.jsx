import React, { useRef, useState, useEffect } from "react";
import {
  Search,
  Edit,
  Award,
  Calendar,
  User,
  BookOpen,
  Percent,
  UserCheck,
  Image as ImageIcon,
  Upload,
  Plus,
  X,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";
import toast from "react-hot-toast";
import AdminMobileNavBar from "./AdminMobileNavBar";


const EditCertificate = () => {
  const contentRef = useRef(null);
  // State for certificate listing
  const [searchQuery, setSearchQuery] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCertificate, setEditingCertificate] = useState(null);

  // State for filters
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [certificatesPerPage, setCertificatesPerPage] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState("");

  // State for create/edit form
  const [formData, setFormData] = useState({
    certificate_id: "",
    student_id: "",
    student_name: "",
    course_name: "",
    course_hours: "",
    enrollment_date: "",
    issue_date: "",
    assignment_percentage: "",
    attendance_percentage: "",
    trained_by: "",
    certificate_image: null,
  });

  const API_URL_IMG = import.meta.env.VITE_URL_IMG;
  const API_URL = import.meta.env.VITE_URL;
  const token = localStorage.getItem("token");

  // Fetch certificates
  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/certificates`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch certificates");

      const data = await res.json();
      const certificateList = Array.isArray(data.certificates)
        ? data.certificates
        : [];
      // Sort by issue date (newest first)
      const sortedCertificates = [...certificateList].sort(
        (a, b) => new Date(b.issue_date) - new Date(a.issue_date)
      );
      setCertificates(sortedCertificates);
      setFilteredCertificates(sortedCertificates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Get unique courses for filter dropdown
  const getUniqueCourses = () => {
    const courses = new Set();
    certificates.forEach((cert) => {
      const cleaned = (cert.course_name || "")
        .toString()
        .trim()
        .replace(/^["']+|["']+$/g, "");
      if (cleaned && cleaned !== "-") courses.add(cleaned);
    });
    return Array.from(courses).sort();
  };

  // Filter certificates based on search, course, and date range
  useEffect(() => {
    let filtered = [...certificates];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (cert) =>
          cert.certificate_id.toString().includes(searchQuery) ||
          cert.student_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply course filter
    if (selectedCourse !== "all") {
      filtered = filtered.filter((cert) => cert.course_name === selectedCourse);
    }

    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(
        (cert) => new Date(cert.issue_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (cert) => new Date(cert.issue_date) <= new Date(dateRange.end)
      );
    }

    setFilteredCertificates(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, selectedCourse, dateRange, certificates]);

  // Handle search change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle course filter change
  const handleCourseFilterChange = (e) => {
    setSelectedCourse(e.target.value);
  };

  // Handle date range change
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCourse("all");
    setDateRange({
      start: "",
      end: "",
    });
  };

  // Handle form changes
  const handleChange = (e) => {
    if (e.target.name === "certificate_image") {
      setFormData({
        ...formData,
        certificate_image: e.target.files?.[0] || null,
      });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  // Prepare form for editing
  const handleEditClick = (certificate) => {
    setEditingCertificate(certificate);
    setFormData({
      ...certificate,
      issue_date: certificate.issue_date
        ? new Date(certificate.issue_date).toISOString().split("T")[0]
        : "",
      enrollment_date: certificate.enrollment_date
        ? new Date(certificate.enrollment_date).toISOString().split("T")[0]
        : "",
      certificate_image: null,
    });
    setShowCreateModal(true);
  };

  // Show image in modal
  const handleImageClick = (imageUrl) => {
    setCurrentImage(`${API_URL_IMG}/images/${imageUrl}`);
    setShowImageModal(true);
  };

  // Create or update certificate
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      if (value !== null) {
        formDataToSend.append(key, value);
      }
    });

    try {
      const endpoint = editingCertificate
        ? `${API_URL}/certificates/${editingCertificate.id}`
        : `${API_URL}/certificates`;

      const method = editingCertificate ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process certificate");
      }

      toast.success(
        `✅ Certificate ${
          editingCertificate ? "updated" : "created"
        } successfully!`
      );
      setShowCreateModal(false);
      setEditingCertificate(null);
      fetchCertificates();
    } catch (error) {
      console.error("Error processing certificate:", error);
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      certificate_id: "",
      student_id: "",
      student_name: "",
      course_name: "",
      course_hours: "",
      enrollment_date: "",
      issue_date: "",
      assignment_percentage: "",
      attendance_percentage: "",
      trained_by: "",
      certificate_image: null,
    });
    setEditingCertificate(null);
  };

  // Pagination logic
  const indexOfLastCertificate = currentPage * certificatesPerPage;
  const indexOfFirstCertificate = indexOfLastCertificate - certificatesPerPage;
  const currentCertificates = filteredCertificates.slice(
    indexOfFirstCertificate,
    indexOfLastCertificate
  );
  const totalPages = Math.ceil(
    filteredCertificates.length / certificatesPerPage
  );

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div ref={contentRef} className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                  Certificate
                </h1>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                <Plus size={18} />
                Create
              </button>
            </div>
            <p className="text-gray-600">
              Manage and create student certificates
            </p>
          </div>

          {/* Filters Section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by ID or Name"
                value={searchQuery}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Course Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BookOpen className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedCourse}
                onChange={handleCourseFilterChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Courses</option>
                {getUniqueCourses().map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range - Start */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="From Date"
              />
            </div>

            {/* Date Range - End */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Additional Filter Controls */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Show:</span>
              <select
                value={certificatesPerPage}
                onChange={(e) => {
                  setCertificatesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="block w-20 pl-3 pr-8 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-700">entries</span>
            </div>

            {/* Reset Filters Button */}
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              Reset Filters
            </button>
          </div>

          {loading && <Loading />}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}

          {/* Certificates Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Certificate ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Course
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Issued Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentCertificates.length > 0 ? (
                    currentCertificates.map((cert) => (
                      <tr
                        key={cert.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="relative cursor-pointer"
                              onClick={() =>
                                cert.certificate_image &&
                                handleImageClick(cert.certificate_image)
                              }
                            >
                              {cert.certificate_image ? (
                                <img
                                  src={`${API_URL_IMG}/images/${cert.certificate_image}`}
                                  alt="Certificate"
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-blue-500 transition-all"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {cert.student_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {cert.certificate_image && (
                                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border border-gray-200">
                                  <Maximize2 className="w-3 h-3 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {cert.student_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {cert.student_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {cert.certificate_id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">
                            {cert.course_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cert.course_hours} hours
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(cert.issue_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleEditClick(cert)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
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
                          <Award className="w-12 h-12 text-gray-300 mb-4" />
                          <p>No certificates found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden space-y-4 p-4">
              {currentCertificates.length > 0 ? (
                currentCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative cursor-pointer"
                          onClick={() =>
                            cert.certificate_image &&
                            handleImageClick(cert.certificate_image)
                          }
                        >
                          {cert.certificate_image ? (
                            <img
                              src={`${API_URL_IMG}/images/${cert.certificate_image}`}
                              alt="Certificate"
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-blue-500 transition-all"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {cert.student_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {cert.certificate_image && (
                            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border border-gray-200">
                              <Maximize2 className="w-3 h-3 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {cert.student_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {cert.certificate_id}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditClick(cert)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Course</p>
                        <p className="font-medium">{cert.course_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Issued</p>
                        <p className="font-medium">
                          {new Date(cert.issue_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                  <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    No Certificates Found
                  </h3>
                  <p className="text-gray-600">
                    No certificates match your filters.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredCertificates.length > certificatesPerPage && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {indexOfFirstCertificate + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    indexOfLastCertificate,
                    filteredCertificates.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {filteredCertificates.length}
                </span>{" "}
                certificates
              </div>

              <div className="flex items-center gap-2">
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
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border ${
                      currentPage === page
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
      </div>

      {/* Create/Edit Certificate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {editingCertificate
                      ? "Edit Certificate"
                      : "Create New Certificate"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Certificate ID */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Award className="w-4 h-4" />
                      Certificate ID
                    </label>
                    <input
                      type="text"
                      name="certificate_id"
                      value={formData.certificate_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Student ID */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      Student ID
                    </label>
                    <input
                      type="text"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Student Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      Student Name
                    </label>
                    <input
                      type="text"
                      name="student_name"
                      value={formData.student_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Course Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <BookOpen className="w-4 h-4" />
                      Course Name
                    </label>
                    <input
                      type="text"
                      name="course_name"
                      value={formData.course_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Course Hours */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4" />
                      Course Hours
                    </label>
                    <input
                      type="number"
                      name="course_hours"
                      value={formData.course_hours}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Enrollment Date */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4" />
                      Enrollment Date
                    </label>
                    <input
                      type="date"
                      name="enrollment_date"
                      value={formData.enrollment_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4" />
                      Issue Date
                    </label>
                    <input
                      type="date"
                      name="issue_date"
                      value={formData.issue_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Attendance Percentage */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Percent className="w-4 h-4" />
                      Attendance %
                    </label>
                    <input
                      type="number"
                      max={100}
                      name="attendance_percentage"
                      value={formData.attendance_percentage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Assignment Percentage */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Percent className="w-4 h-4" />
                      Assignment %
                    </label>
                    <input
                      type="number"
                      max={100}
                      name="assignment_percentage"
                      value={formData.assignment_percentage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Trained By */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <UserCheck className="w-4 h-4" />
                      Trained By
                    </label>
                    <input
                      type="text"
                      name="trained_by"
                      value={formData.trained_by}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Certificate Image */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <ImageIcon className="w-4 h-4" />
                    Certificate Image
                  </label>
                  <input
                    type="file"
                    name="certificate_image"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required={!editingCertificate}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    {editingCertificate
                      ? "Update Certificate"
                      : "Create Certificate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Certificate Image
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={currentImage}
                alt="Certificate Full View"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <AdminMobileNavBar scrollContainerRef={contentRef} />
    </div>
  );
};

export default EditCertificate;
