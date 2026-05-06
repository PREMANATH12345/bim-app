import React, { useEffect, useState } from "react";
import {
  Users,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Plus,
  Search,
  X,
  AlertTriangle,
  Shield,
  Clock,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,

} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";
import toast from "react-hot-toast";


const API_URL = import.meta.env.VITE_URL;

const AdminManagement = () => {
  const token = localStorage.getItem("token");
  const decodedData = jwtDecode(token);
  const adminName = decodedData.name;
  const loggedInUserId = decodedData.id;

  // State for active tab
  const [activeTab, setActiveTab] = useState("users");

  // User management state
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    user_name: "",
    password: "",
    batch: "",
    role: "student",
  });
  const [editUser, setEditUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filters state
  const [roleFilter, setRoleFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [sortField, setSortField] = useState("attempted_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const itemsPerPage = 10;

  // Failed logins state
  const [failedLogins, setFailedLogins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredFailedLogins = failedLogins
    .filter((log) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_id.toLowerCase().includes(searchTerm.toLowerCase());

      // Date filter
      const logDate = new Date(log.attempted_at);
      const matchesDate =
        (dateRange.from === "" || logDate >= new Date(dateRange.from)) &&
        (dateRange.to === "" ||
          logDate <= new Date(dateRange.to + "T23:59:59"));

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      // Sorting
      if (a[sortField] < b[sortField]) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Get current items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFailedLogins.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setFilteredUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch failed logins
  const fetchFailedLogins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/failed-logins`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch failed logins");

      const data = await res.json();
      setFailedLogins(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else {
      fetchFailedLogins();
    }
  }, [activeTab]);

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.batch.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Apply batch filter
    if (batchFilter !== "all") {
      filtered = filtered.filter((user) => user.batch === batchFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.active === statusFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, roleFilter, batchFilter, statusFilter, users]);

  // Get unique batches for filter dropdown
  const getUniqueBatches = () => {
    const batches = new Set(users.map((user) => user.batch));
    return Array.from(batches).sort();
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setBatchFilter("all");
    setStatusFilter("all");
  };

  // Create new user
  const createUser = async () => {
    if (!newUser.name || !newUser.user_name || !newUser.password) {
      toast.error("All fields are required!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();
      toast.success(data.message);
      fetchUsers();
      setNewUser({
        name: "",
        user_name: "",
        password: "",
        batch: "",
        role: "student",
      });
      setShowCreateModal(false);
    } catch (error) {
      toast.error("Error creating user: " + error.message);
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`${API_URL}/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      toast.success(data.message);
      fetchUsers();
    } catch (error) {
      toast.error("Error deleting user: " + error.message);
    }
  };

  // Toggle user status
  const toggleUserStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "yes" ? "no" : "yes";

    try {
      const res = await fetch(`${API_URL}/toggleUserStatus/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: newStatus }),
      });

      const data = await res.json();
      toast.success(data.message);
      fetchUsers();
    } catch (error) {
      toast.error("Error updating status: " + error.message);
    }
  };

  // Edit user
  const editExistingUser = async () => {
    if (!editUser) return;

    try {
      const res = await fetch(`${API_URL}/users/${editUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editUser),
      });

      const data = await res.json();
      toast.success(data.message);
      setEditUser(null);
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error("Error updating user: " + error.message);
    }
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`p-2 rounded-lg ${
                  activeTab === "users"
                    ? "bg-gradient-to-r from-blue-500 to-purple-500"
                    : "bg-gradient-to-r from-red-500 to-orange-500"
                }`}
              >
                {activeTab === "users" ? (
                  <Users className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white" />
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                {activeTab === "users"
                  ? "User Management"
                  : "Failed Login Attempts"}
              </h1>
            </div>
            <p className="text-gray-600">
              {activeTab === "users"
                ? "Manage users and create new accounts"
                : "Monitor unauthorized access attempts"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "users"
                  ? "text-blue-600 border-b-2 border-blue-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab("failedLogins")}
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "failedLogins"
                  ? "text-red-600 border-b-2 border-red-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Failed Logins
            </button>
          </div>

          {loading && <Loading />}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          )}

          {/* User Management Content */}
          {activeTab === "users" && (
            <>
              {/* Filters Section */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Role Filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Batch Filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
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

                {/* Status Filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Power className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="yes">Active</option>
                    <option value="no">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Additional Controls */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Show:</span>
                  <select
                    value={usersPerPage}
                    onChange={(e) => {
                      setUsersPerPage(Number(e.target.value));
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

                {/* Create User Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium whitespace-nowrap"
                >
                  <Plus size={18} />
                  Create User
                </button>
              </div>

              {/* Users Table - Desktop */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Username
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Batch
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Device ID
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentUsers.length > 0 ? (
                        currentUsers.map((user) => (
                          <tr
                            key={user.id}
                            className={`hover:bg-gray-50 transition-colors ${
                              user.id == loggedInUserId
                                ? "bg-blue-50 border-l-4 border-blue-500"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                {user.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-900">
                              {user.user_name}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {user.batch}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  user.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  user.active === "yes"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.active === "yes" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-500 text-sm">
                                {user.device_id
                                  ? `${user.device_id.substring(0, 8)}...`
                                  : "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditUser(user);
                                    setShowEditModal(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    toggleUserStatus(user.id, user.active)
                                  }
                                  className={`p-2 rounded transition-colors ${
                                    user.active === "yes"
                                      ? "text-red-600 hover:bg-red-50"
                                      : "text-green-600 hover:bg-green-50"
                                  }`}
                                  title={
                                    user.active === "yes"
                                      ? "Deactivate"
                                      : "Activate"
                                  }
                                >
                                  {user.active === "yes" ? (
                                    <PowerOff size={16} />
                                  ) : (
                                    <Power size={16} />
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id)}
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
                            colSpan="7"
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Users List - Mobile */}
              <div className="md:hidden space-y-4 mb-8">
                {currentUsers.length > 0 ? (
                  currentUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
                        user.id == loggedInUserId
                          ? "border-l-4 border-blue-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {user.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              @{user.user_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditUser(user);
                              setShowEditModal(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() =>
                              toggleUserStatus(user.id, user.active)
                            }
                            className={`p-1 rounded transition-colors ${
                              user.active === "yes"
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {user.active === "yes" ? (
                              <PowerOff size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Batch</p>
                          <p className="font-medium">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {user.batch}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Role</p>
                          <p className="font-medium">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                user.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {user.role}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                user.active === "yes"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.active === "yes" ? "Active" : "Inactive"}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Device ID</p>
                          <p className="font-medium">
                            {user.device_id
                              ? `${user.device_id.substring(0, 8)}...`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    No users found
                  </div>
                )}
              </div>

              {/* Pagination */}
              {filteredUsers.length > usersPerPage && (
                <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">{indexOfFirstUser + 1}</span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastUser, filteredUsers.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">{filteredUsers.length}</span>{" "}
                    users
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
            </>
          )}

          {/* Failed Logins Content */}
          {activeTab === "failedLogins" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Filters and Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search by name or user ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="from-date"
                        className="text-sm text-gray-600"
                      >
                        From:
                      </label>
                      <input
                        type="date"
                        id="from-date"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={dateRange.from}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, from: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="to-date"
                        className="text-sm text-gray-600"
                      >
                        To:
                      </label>
                      <input
                        type="date"
                        id="to-date"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={dateRange.to}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, to: e.target.value })
                        }
                        min={dateRange.from}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setDateRange({ from: "", to: "" });
                        setSearchTerm("");
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer"
                        onClick={() => handleSort("user_id")}
                      >
                        <div className="flex items-center gap-1">
                          User ID
                          {sortField === "user_id" && (
                            <ChevronUp
                              className={`w-4 h-4 transition-transform ${
                                sortDirection === "asc" ? "" : "rotate-180"
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === "name" && (
                            <ChevronUp
                              className={`w-4 h-4 transition-transform ${
                                sortDirection === "asc" ? "" : "rotate-180"
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer"
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center gap-1">
                          Role
                          {sortField === "role" && (
                            <ChevronUp
                              className={`w-4 h-4 transition-transform ${
                                sortDirection === "asc" ? "" : "rotate-180"
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer"
                        onClick={() => handleSort("attempted_at")}
                      >
                        <div className="flex items-center gap-1">
                          Attempted At
                          {sortField === "attempted_at" && (
                            <ChevronUp
                              className={`w-4 h-4 transition-transform ${
                                sortDirection === "asc" ? "" : "rotate-180"
                              }`}
                            />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFailedLogins.length > 0 ? (
                      currentItems.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <span className="font-medium text-gray-900">
                                {log.user_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {log.name}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {log.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(log.attempted_at).toLocaleString()}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center">
                            <Shield className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium mb-2">
                              No Failed Login Attempts
                            </p>
                            <p>
                              Your system is secure! No unauthorized access
                              attempts detected.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden">
                {filteredFailedLogins.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {currentItems.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {log.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {log.user_id}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Role</p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                log.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {log.role}
                            </span>
                          </div>
                          <div>
                            <p className="text-gray-500">Attempted</p>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(
                                  log.attempted_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">
                      No Failed Login Attempts
                    </p>
                    <p>
                      Your system is secure! No unauthorized access attempts
                      detected.
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {filteredFailedLogins.length > 0 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            currentPage * itemsPerPage,
                            filteredFailedLogins.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {filteredFailedLogins.length}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {Array.from({
                          length: Math.ceil(
                            filteredFailedLogins.length / itemsPerPage
                          ),
                        }).map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPage(index + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === index + 1
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(
                                prev + 1,
                                Math.ceil(
                                  filteredFailedLogins.length / itemsPerPage
                                )
                              )
                            )
                          }
                          disabled={
                            currentPage ===
                            Math.ceil(
                              filteredFailedLogins.length / itemsPerPage
                            )
                          }
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Create New User
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={newUser.user_name}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      user_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <input
                  type="text"
                  placeholder="Enter batch"
                  value={newUser.batch}
                  onChange={(e) =>
                    setNewUser({ ...newUser, batch: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={editUser.user_name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, user_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={editUser.password}
                  onChange={(e) =>
                    setEditUser({ ...editUser, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-sm text-blue-600 focus:outline-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <input
                  type="text"
                  placeholder="Enter batch"
                  value={editUser.batch}
                  onChange={(e) =>
                    setEditUser({ ...editUser, batch: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                 Device Id
                </label>
                <input
                  type="text"
                  placeholder="Enter batch"
                  value={editUser.device_id}
                  onChange={(e) =>
                    setEditUser({ ...editUser, device_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editExistingUser}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
