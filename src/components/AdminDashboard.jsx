import React, { useEffect, useRef, useState } from "react";
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
import AdminMobileNavBar from "./AdminMobileNavBar";

const API_URL = import.meta.env.VITE_URL;

const AdminManagement = () => {
  const contentRef = useRef(null);
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
    allowed_device_count: 1,
    accessVideo: [],
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

  // All videos (used to show batch-related videos in create/edit user forms)
  const [allVideos, setAllVideos] = useState([]);

  // Batches (from Batch management) used to power the Batch multi-select
  // chip box in Create/Edit User, instead of a free-text field.
  const [batchesList, setBatchesList] = useState([]);
  const [createBatchDropdownOpen, setCreateBatchDropdownOpen] = useState(false);
  const [createBatchSearch, setCreateBatchSearch] = useState("");
  const createBatchBoxRef = useRef(null);
  const [editBatchDropdownOpen, setEditBatchDropdownOpen] = useState(false);
  const [editBatchSearch, setEditBatchSearch] = useState("");
  const editBatchBoxRef = useRef(null);
  // Which batch's video list is expanded in the "Videos for this batch"
  // accordion — one batch label at a time, per form (Create / Edit). Picking
  // a new batch does NOT auto-expand it; the admin must click its name.
  const [createExpandedBatchGroup, setCreateExpandedBatchGroup] =
    useState(null);
  const [editExpandedBatchGroup, setEditExpandedBatchGroup] = useState(null);

  const filteredFailedLogins = failedLogins
    .filter((log) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        (log.name && String(log.name).toLowerCase().includes(searchLower)) ||
        (log.user_id &&
          String(log.user_id).toLowerCase().includes(searchLower));

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
    indexOfLastItem,
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

  // Fetch all videos (admin-only) so we can show batch-related videos
  // when creating/editing a user, without touching anything else.
  const fetchAllVideos = async () => {
    try {
      const res = await fetch(`${API_URL}/videos/getAllVideo`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return; // no videos yet, or non-admin — just skip silently
      const data = await res.json();
      setAllVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (err) {
      // Non-critical: user management still works without this list
      console.error("Error fetching videos:", err);
    }
  };

  // Fetch the list of batches (Batch management) so the Batch field in
  // Create/Edit User can be a select instead of free text.
  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_URL}/batches`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const rawBatches = Array.isArray(data?.batches)
        ? data.batches
        : Array.isArray(data)
          ? data
          : [];

      setBatchesList(
        rawBatches
          .map((batch) => {
            if (!batch) return null;
            if (typeof batch === "string") {
              const name = batch.trim();
              return name ? { id: name, name } : null;
            }
            const name =
              batch.name || batch.batch_name || batch.batch || batch.label;
            return name && String(name).trim()
              ? {
                  id: batch.id || String(name).trim(),
                  name: String(name).trim(),
                }
              : null;
          })
          .filter(Boolean),
      );
    } catch (err) {
      console.error("Error fetching batches:", err);
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
      fetchAllVideos();
      fetchBatches();
    } else {
      fetchFailedLogins();
    }
  }, [activeTab]);

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          (user.name &&
            String(user.name).toLowerCase().includes(searchLower)) ||
          (user.user_name &&
            String(user.user_name).toLowerCase().includes(searchLower)) ||
          (Array.isArray(user.batch)
            ? user.batch.some(
                (b) => b && String(b).toLowerCase().includes(searchLower),
              )
            : user.batch &&
              String(user.batch).toLowerCase().includes(searchLower)),
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Apply batch filter
    if (batchFilter !== "all") {
      filtered = filtered.filter((user) =>
        Array.isArray(user.batch)
          ? user.batch.some(
              (b) => b != null && String(b) === String(batchFilter),
            )
          : user.batch != null && String(user.batch) === String(batchFilter),
      );
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
    const batches = new Set();
    users.forEach((user) => {
      if (Array.isArray(user.batch)) {
        user.batch.forEach((b) => b && batches.add(String(b)));
      } else if (user.batch != null && user.batch !== "") {
        batches.add(String(user.batch));
      }
    });
    return Array.from(batches).sort();
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setBatchFilter("all");
    setStatusFilter("all");
  };

  const cleanString = (str) => {
    if (!str) return "";
    return String(str)
      .trim()
      .replace(/^["']+|["']+$/g, "");
  };

  const cleanBatch = (batchInput) => {
    if (!batchInput) return [];
    if (Array.isArray(batchInput)) {
      return batchInput.map((b) => cleanString(b)).filter(Boolean);
    }
    return String(batchInput)
      .split(",")
      .map((b) => cleanString(b))
      .filter(Boolean);
  };

  // Normalize any batch value (plain string, comma list, JSON-ish array
  // string, or real array) into a clean, deduped, lowercased array —
  // used only to match videos to the batch typed/selected in the user form.
  const normalizeBatchForMatch = (value) => {
    let values = value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        values = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        values = value.split(",");
      }
    }
    if (!Array.isArray(values)) values = [values];
    return [
      ...new Set(
        values
          .map((v) =>
            String(v ?? "")
              .replace(/[\[\]"']/g, "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    ];
  };

  // Videos whose batch overlaps with the batch(es) currently entered in a
  // create/edit user form.
  const getVideosForBatch = (batchValue) => {
    const batches = normalizeBatchForMatch(batchValue);
    if (batches.length === 0) return [];
    return allVideos.filter((video) =>
      normalizeBatchForMatch(video.batch).some((b) => batches.includes(b)),
    );
  };

  // Same as above, but split per individual batch so multi-batch entries
  // (e.g. "3A/2025, 4/2025") show a separate labeled group of videos for
  // each batch instead of one merged list.
  const getVideoGroupsByBatch = (batchValue) => {
    const rawBatches = Array.isArray(batchValue)
      ? batchValue
      : String(batchValue || "").split(",");
    const labels = rawBatches.map((b) => cleanString(b)).filter(Boolean);

    return labels.map((label) => {
      const normalizedLabel = normalizeBatchForMatch(label)[0] || "";
      const videos = allVideos.filter((video) =>
        normalizeBatchForMatch(video.batch).includes(normalizedLabel),
      );
      return { label, videos };
    });
  };

  const toggleAccessVideo = (currentList, videoId, checked) => {
    const list = Array.isArray(currentList) ? currentList : [];
    return checked ? [...list, videoId] : list.filter((id) => id !== videoId);
  };

  const getAvailableBatchOptions = () => {
    const seen = new Set();
    const options = [];

    const pushBatch = (value) => {
      const cleaned = cleanString(value);
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push(cleaned);
    };

    batchesList.forEach((batch) => pushBatch(batch?.name || batch?.batch_name));
    allVideos.forEach((video) => pushBatch(video?.batch));
    users.forEach((user) => {
      if (Array.isArray(user?.batch)) {
        user.batch.forEach((batch) => pushBatch(batch));
      } else {
        pushBatch(user?.batch);
      }
    });

    return options.sort((a, b) => a.localeCompare(b));
  };

  // Add/remove a batch name from a multi-select batch list (used by the
  // Batch chip box in Create/Edit User).
  const toggleBatchChip = (currentList, batchName) => {
    const list = Array.isArray(currentList)
      ? currentList
      : cleanBatch(currentList);
    return list.includes(batchName)
      ? list.filter((b) => b !== batchName)
      : [...list, batchName];
  };

  // Close the batch dropdowns on outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        createBatchBoxRef.current &&
        !createBatchBoxRef.current.contains(e.target)
      ) {
        setCreateBatchDropdownOpen(false);
      }
      if (
        editBatchBoxRef.current &&
        !editBatchBoxRef.current.contains(e.target)
      ) {
        setEditBatchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resolve batch name or ID to batch ID
  const getBatchId = (nameOrId) => {
    if (nameOrId == null || nameOrId === "") return "";
    const str = String(nameOrId).trim().toLowerCase();
    const found = batchesList.find(
      (b) =>
        String(b.id).trim().toLowerCase() === str ||
        String(b.name).trim().toLowerCase() === str,
    );
    return found ? String(found.id) : String(nameOrId).trim();
  };

  // Resolve batch name or ID to batch Name
  const getBatchName = (nameOrId) => {
    if (nameOrId == null || nameOrId === "") return "";
    const str = String(nameOrId).trim().toLowerCase();
    const found = batchesList.find(
      (b) =>
        String(b.id).trim().toLowerCase() === str ||
        String(b.name).trim().toLowerCase() === str,
    );
    return found ? found.name : String(nameOrId).trim();
  };

  // Check if a given batch (by name or ID) is in full access batches
  const isBatchInFullAccess = (batchNameOrId, fullBatches, userAccess = []) => {
    if (!fullBatches || (Array.isArray(fullBatches) && fullBatches.length === 0)) {
      return !userAccess || userAccess.length === 0;
    }
    if (!Array.isArray(fullBatches)) return false;
    const bId = getBatchId(batchNameOrId);
    const bName = getBatchName(batchNameOrId).toLowerCase();
    const rawClean = String(batchNameOrId).replace(/[\[\]"']/g, "").trim().toLowerCase();

    return fullBatches.some((fb) => {
      const fbClean = String(fb).replace(/[\[\]"']/g, "").trim();
      if (!fbClean) return false;
      const fbLower = fbClean.toLowerCase();
      const fbName = getBatchName(fbClean).toLowerCase();
      const fbId = getBatchId(fbClean);

      return (
        fbClean === bId ||
        fbLower === bName ||
        fbLower === rawClean ||
        fbId === bId ||
        fbName === bName ||
        fbName === rawClean
      );
    });
  };

  const getFullAccessBatches = (userBatch, currentAccessVideo) => {
    const userBatches = cleanBatch(userBatch);
    if (!userBatches || userBatches.length === 0) return [];

    const currentAccess = Array.isArray(currentAccessVideo)
      ? currentAccessVideo
      : [];
    const batchGroups = getVideoGroupsByBatch(userBatch);

    return batchGroups
      .filter((group) => {
        const groupIds = group.videos.map((v) => v.id);
        if (groupIds.length === 0) return true;
        const selectedCount = groupIds.filter((id) =>
          currentAccess.includes(id)
        ).length;
        // Full access mode if 0 videos checked (default auto-new) OR if ALL videos in batch are checked
        return selectedCount === 0 || selectedCount === groupIds.length;
      })
      .map((group) => getBatchName(group.label));
  };

  // Computes accessVideo array for multi-batch users:
  // - If ALL assigned batches are set to "All Videos (Auto-new)", returns null (full backend access).
  // - If AT LEAST ONE batch is set to "Specific", returns explicit IDs for partial batches PLUS all video IDs for full-access batches so the backend doesn't filter full-access batch videos out!
// Computes accessVideo array for multi-batch users:
// - If ALL assigned batches are "All Videos (Auto-new)", returns null (full backend access).
// - If AT LEAST ONE batch is "Specific", returns explicit IDs ONLY for the
//   specific-access batches. Full-access batches contribute NOTHING here —
//   their access is governed purely by fullAccessBatches, so newly added
//   videos in that batch show up automatically without needing a re-save.
const computeFinalAccessVideo = (userBatch, currentAccessVideo, fullBatches = []) => {
  const userBatches = cleanBatch(userBatch);
  if (!userBatches || userBatches.length === 0) return null;

  const currentAccess = Array.isArray(currentAccessVideo)
    ? currentAccessVideo
    : [];
  const batchGroups = getVideoGroupsByBatch(userBatch);
  const userFull = Array.isArray(fullBatches) ? fullBatches : [];

  // Does ANY batch have specific (non-full) access with at least one video checked?
  const batchesWithSpecificAccess = batchGroups.filter((group) => {
    const groupIds = group.videos.map((v) => v.id);
    const isFull = isBatchInFullAccess(group.label, userFull, currentAccess);
    return !isFull && groupIds.some((id) => currentAccess.includes(id));
  });

  // No batch is in "Specific" mode -> every batch is full-access -> null
  // tells the backend/student page to rely entirely on fullAccessBatches.
  if (batchesWithSpecificAccess.length === 0) {
    return null;
  }

  // At least one batch is "Specific" -> we must return an explicit array.
  // IMPORTANT: only add IDs for the specific-access batches. Do NOT add IDs
  // for full-access batches — doing so freezes a snapshot of "current"
  // videos and breaks auto-inclusion of videos added later.
  const finalIds = new Set();
  batchGroups.forEach((group) => {
    const isFull = isBatchInFullAccess(group.label, userFull, currentAccess);

    if (isFull) {
      // Full-access batch: contribute nothing to accessVideo.
      // Its access is resolved dynamically via fullAccessBatches on the
      // student dashboard (isBatchInFullAccess + getVideosForBatch),
      // so new videos added to this batch are picked up automatically.
      return;
    }

    // Specific-access batch: include only the explicitly checked video IDs.
    group.videos.forEach((v) => {
      if (currentAccess.includes(v.id)) {
        finalIds.add(v.id);
      }
    });
  });

  return Array.from(finalIds);
};
  // Create new user
  const createUser = async () => {
    if (!newUser.name || !newUser.user_name || !newUser.password) {
      toast.error("All fields are required!");
      return;
    }

    const assignedBatches = cleanBatch(newUser.batch);
    const userFullBatches = (
      Array.isArray(newUser.fullAccessBatches)
        ? newUser.fullAccessBatches
        : getFullAccessBatches(newUser.batch, newUser.accessVideo)
    ).map(getBatchName);

    const cleanedUser = {
      ...newUser,
      name: cleanString(newUser.name),
      user_name: cleanString(newUser.user_name),
      batch: assignedBatches,
      fullAccessBatches: userFullBatches,
      allowed_device_count: Number(newUser.allowed_device_count) || 1,
      accessVideo: computeFinalAccessVideo(newUser.batch, newUser.accessVideo, userFullBatches),
    };

    try {
      const res = await fetch(`${API_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedUser),
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
        allowed_device_count: 1,
        accessVideo: [],
        fullAccessBatches: [],
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

    const assignedBatches = cleanBatch(editUser.batch);
    const userFullBatches = (
      Array.isArray(editUser.fullAccessBatches)
        ? editUser.fullAccessBatches
        : getFullAccessBatches(editUser.batch, editUser.accessVideo)
    ).map(getBatchName);

    const cleanedEditUser = {
      ...editUser,
      name: cleanString(editUser.name),
      user_name: cleanString(editUser.user_name),
      batch: assignedBatches,
      device_id: cleanString(editUser.device_id),
      fullAccessBatches: userFullBatches,
      allowed_device_count: Number(editUser.allowed_device_count) || 1,
      accessVideo: computeFinalAccessVideo(
        editUser.batch,
        editUser.accessVideo,
        userFullBatches,
      ),
    };

    try {
      const res = await fetch(`${API_URL}/users/${editUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedEditUser),
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

        <div
          ref={contentRef}
          className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto"
        >
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
                        {/* <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Allowed Devices
                        </th> */}
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Registered Devices
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
                                  {user.name
                                    ? String(user.name).charAt(0).toUpperCase()
                                    : "?"}
                                </div>
                                {user.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-900">
                              {user.user_name}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5 min-w-[160px]">
                                {cleanBatch(user.batch).length > 0 ? (
                                  cleanBatch(user.batch).map((b) => {
                                    const userAccess = Array.isArray(user.accessVideo)
                                      ? user.accessVideo
                                      : [];
                                    const userFullBatches = Array.isArray(user.fullAccessBatches)
                                      ? user.fullAccessBatches
                                      : [];
                                    const groupVideos = getVideosForBatch(b);
                                    const groupIds = groupVideos.map((v) => v.id);
                                    const count = groupIds.filter((id) =>
                                      userAccess.includes(id)
                                    ).length;
                                    const isFull = isBatchInFullAccess(
                                      b,
                                      userFullBatches,
                                      userAccess,
                                    );

                                    return (
                                      <div
                                        key={b}
                                        className="flex items-center gap-1.5 text-xs flex-wrap"
                                      >
                                        <span className="font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                          {getBatchName(b) || b}
                                        </span>
                                        {isFull ? (
                                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-medium text-[11px]">
                                            ✨ All Videos
                                          </span>
                                        ) : (
                                          <span className="bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium text-[11px]">
                                            🔒 Specific ({count}/{groupIds.length})
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-gray-400">N/A</span>
                                )}
                              </div>
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
                            {/* <td className="px-6 py-4 text-gray-900 font-medium">
                              {user.allowed_device_count || 1}
                            </td> */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                {/* <span className="text-sm font-medium text-gray-800">
                                  {user.device_id ? String(user.device_id).split(",").filter(Boolean).length : 0} / {user.allowed_device_count || 1} Registered
                                </span> */}
                                <span
                                  className="text-xs text-gray-500 truncate max-w-[120px]"
                                  title={user.device_id || "None"}
                                >
                                  {user.device_id || "None"}
                                </span>
                              </div>
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
                            {user.name
                              ? String(user.name).charAt(0).toUpperCase()
                              : "?"}
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
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.isArray(user.batch) ? (
                              user.batch.map((b, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {b}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {user.batch || "N/A"}
                              </span>
                            )}
                          </div>
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
                          <p className="text-gray-500">Allowed Devices</p>
                          <p className="font-medium">
                            {user.allowed_device_count || 1}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Registered Devices</p>
                          <div className="flex flex-col mt-1">
                            <span className="font-medium text-sm text-gray-800">
                              {user.device_id
                                ? String(user.device_id)
                                    .split(",")
                                    .filter(Boolean).length
                                : 0}{" "}
                              / {user.allowed_device_count || 1} Registered
                            </span>
                            <span
                              className="text-xs text-gray-500 truncate max-w-[150px]"
                              title={user.device_id || "None"}
                            >
                              {user.device_id || "None"}
                            </span>
                          </div>
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
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2">
                      <label
                        htmlFor="from-date"
                        className="text-sm text-gray-600 whitespace-nowrap"
                      >
                        From:
                      </label>
                      <input
                        type="date"
                        id="from-date"
                        className="block min-w-0 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={dateRange.from}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, from: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2">
                      <label
                        htmlFor="to-date"
                        className="text-sm text-gray-600 whitespace-nowrap"
                      >
                        To:
                      </label>
                      <input
                        type="date"
                        id="to-date"
                        className="block min-w-0 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                  log.attempted_at,
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
                            filteredFailedLogins.length,
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
                            filteredFailedLogins.length / itemsPerPage,
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
                                  filteredFailedLogins.length / itemsPerPage,
                                ),
                              ),
                            )
                          }
                          disabled={
                            currentPage ===
                            Math.ceil(
                              filteredFailedLogins.length / itemsPerPage,
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-xl max-h-[90vh] flex flex-col my-auto overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                Create New User
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser();
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
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
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-10 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="relative" ref={createBatchBoxRef}>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Batch
                  </label>
                  <div
                    className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-xl px-2.5 py-1.5 text-sm bg-white cursor-text focus-within:ring-2 focus-within:ring-blue-500"
                    onClick={() => setCreateBatchDropdownOpen(true)}
                  >
                    {cleanBatch(newUser.batch).map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        {b}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewUser({
                              ...newUser,
                              batch: toggleBatchChip(newUser.batch, b),
                            });
                          }}
                          className="hover:text-blue-950"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={createBatchSearch}
                      onChange={(e) => {
                        setCreateBatchSearch(e.target.value);
                        setCreateBatchDropdownOpen(true);
                      }}
                      onFocus={() => setCreateBatchDropdownOpen(true)}
                      placeholder={
                        cleanBatch(newUser.batch).length === 0
                          ? "Select batch(es)"
                          : "Add another..."
                      }
                      className="flex-1 min-w-[100px] outline-none text-sm py-0.5"
                    />
                  </div>

                  {createBatchDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                      {(() => {
                        const options = getAvailableBatchOptions()
                          .filter(
                            (batchName) =>
                              !cleanBatch(newUser.batch).includes(batchName),
                          )
                          .filter(
                            (batchName) =>
                              !createBatchSearch.trim() ||
                              batchName
                                .toLowerCase()
                                .includes(
                                  createBatchSearch.trim().toLowerCase(),
                                ),
                          );
                        return options.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-400">
                            No matching batches.
                          </p>
                        ) : (
                          options.map((batchName) => (
                            <button
                              key={batchName}
                              type="button"
                              onClick={() => {
                                setNewUser({
                                  ...newUser,
                                  batch: toggleBatchChip(
                                    newUser.batch,
                                    batchName,
                                  ),
                                });
                                setCreateBatchSearch("");
                              }}
                              className="w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              {batchName}
                            </button>
                          ))
                        );
                      })()}
                    </div>
                  )}
                </div>

                {newUser.batch && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Video Access Control
                    </label>

                    {getVideosForBatch(newUser.batch).length > 0 ? (
                      <div className="space-y-3">
                        {getVideoGroupsByBatch(newUser.batch).map((group) => {
                          const groupIds = group.videos.map((v) => v.id);
                          const userAccess = newUser.accessVideo || [];
                          const batchId = getBatchId(group.label);
                          const batchName = getBatchName(group.label);
                          const userFullBatches = Array.isArray(newUser.fullAccessBatches)
                            ? newUser.fullAccessBatches
                            : getFullAccessBatches(newUser.batch, userAccess);
                          const isFullAccessBatch = isBatchInFullAccess(
                            group.label,
                            userFullBatches,
                            userAccess,
                          );
                          const hasSpecificAccess =
                            !isFullAccessBatch &&
                            groupIds.some((id) => userAccess.includes(id));
                          const selectedCount = groupIds.filter((id) =>
                            userAccess.includes(id),
                          ).length;
                          const isExpanded =
                            createExpandedBatchGroup === group.label;

                          return (
                            <div
                              key={group.label}
                              className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-3 shadow-sm"
                            >
                              {/* Batch Header & Mode Controls */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-gray-800">
                                    {group.label}
                                  </span>
                                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {group.videos.length} videos
                                  </span>
                                </div>

                                {/* Mode Selector */}
                                <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg text-xs font-medium">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentFull = (
                                        Array.isArray(newUser.fullAccessBatches)
                                          ? newUser.fullAccessBatches
                                          : cleanBatch(newUser.batch).map(getBatchName)
                                      );
                                      setNewUser({
                                        ...newUser,
                                        fullAccessBatches: [
                                          ...new Set([
                                            ...currentFull,
                                            batchName,
                                          ]),
                                        ],
                                        accessVideo: userAccess.filter(
                                          (id) => !groupIds.includes(id),
                                        ),
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                                      !hasSpecificAccess
                                        ? "bg-white text-blue-700 shadow-sm font-semibold"
                                        : "text-gray-600 hover:text-gray-900"
                                    }`}
                                  >
                                    All Videos (Auto-new)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentFull = (
                                        Array.isArray(newUser.fullAccessBatches)
                                          ? newUser.fullAccessBatches
                                          : cleanBatch(newUser.batch).map(getBatchName)
                                      ).filter(
                                        (b) =>
                                          String(b) !== batchId &&
                                          String(b) !== batchName &&
                                          getBatchName(b).toLowerCase() !==
                                            group.label.toLowerCase(),
                                      );
                                      if (!hasSpecificAccess) {
                                        setNewUser({
                                          ...newUser,
                                          fullAccessBatches: currentFull,
                                          accessVideo: [
                                            ...new Set([
                                              ...userAccess,
                                              ...groupIds,
                                            ]),
                                          ],
                                        });
                                      } else {
                                        setNewUser({
                                          ...newUser,
                                          fullAccessBatches: currentFull,
                                        });
                                      }
                                      setCreateExpandedBatchGroup(group.label);
                                    }}
                                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                                      hasSpecificAccess
                                        ? "bg-white text-blue-700 shadow-sm font-semibold"
                                        : "text-gray-600 hover:text-gray-900"
                                    }`}
                                  >
                                    Specific ({selectedCount}/{groupIds.length})
                                  </button>
                                </div>
                              </div>

                              {/* Mode Banner */}
                              {!hasSpecificAccess ? (
                                <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-900 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                      ✨ Full Access Mode
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCreateExpandedBatchGroup(
                                          isExpanded ? null : group.label,
                                        )
                                      }
                                      className="text-emerald-700 hover:text-emerald-900 font-medium underline text-[11px]"
                                    >
                                      {isExpanded
                                        ? "Hide video list"
                                        : "Preview videos"}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-emerald-700">
                                    Student gets access to{" "}
                                    <strong>
                                      all {group.videos.length} current videos
                                    </strong>{" "}
                                    and any{" "}
                                    <strong>
                                      new videos added in the future
                                    </strong>{" "}
                                    for batch {group.label}.
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-amber-50/90 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex flex-col gap-1.5">
                                  <span className="font-semibold text-amber-800">
                                    🔒 Specific Video Access Mode
                                  </span>
                                  <p className="text-[11px] text-amber-800">
                                    Only checked videos below are accessible.
                                    Future videos added to this batch will stay
                                    locked for this student.
                                  </p>
                                </div>
                              )}

                              {/* Video List */}
                              {(hasSpecificAccess || isExpanded) && (
                                <div className="space-y-2 pt-1 border-t border-gray-100">
                                  {hasSpecificAccess && (
                                    <div className="flex items-center justify-between text-xs pt-1">
                                      <span className="text-gray-600 font-medium text-[11px]">
                                        Select accessible videos:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setNewUser({
                                              ...newUser,
                                              accessVideo: [
                                                ...new Set([
                                                  ...userAccess,
                                                  ...groupIds,
                                                ]),
                                              ],
                                            })
                                          }
                                          className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                                        >
                                          Check All
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setNewUser({
                                              ...newUser,
                                              accessVideo: userAccess.filter(
                                                (id) => !groupIds.includes(id),
                                              ),
                                            })
                                          }
                                          className="text-gray-500 hover:text-gray-700 font-medium text-[11px]"
                                        >
                                          Uncheck All (Switch to All)
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                    {group.videos.map((video) => {
                                      const isChecked =
                                        !hasSpecificAccess ||
                                        userAccess.includes(video.id);
                                      return (
                                        <label
                                          key={video.id}
                                          className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                            isChecked
                                              ? "bg-blue-50/80 border border-blue-200/60 text-blue-950 font-medium"
                                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              if (!hasSpecificAccess) {
                                                const currentFull = (
                                                  Array.isArray(newUser.fullAccessBatches)
                                                    ? newUser.fullAccessBatches
                                                    : cleanBatch(newUser.batch).map(getBatchName)
                                                ).filter(
                                                  (b) =>
                                                    String(b) !== batchId &&
                                                    String(b) !== batchName &&
                                                    getBatchName(b).toLowerCase() !==
                                                      group.label.toLowerCase(),
                                                );
                                                const newGroupAccess = e.target.checked
                                                  ? groupIds
                                                  : groupIds.filter((id) => id !== video.id);

                                                setNewUser({
                                                  ...newUser,
                                                  fullAccessBatches: currentFull,
                                                  accessVideo: [
                                                    ...new Set([
                                                      ...userAccess.filter(
                                                        (id) => !groupIds.includes(id),
                                                      ),
                                                      ...newGroupAccess,
                                                    ]),
                                                  ],
                                                });
                                                setCreateExpandedBatchGroup(group.label);
                                              } else {
                                                setNewUser({
                                                  ...newUser,
                                                  accessVideo: toggleAccessVideo(
                                                    newUser.accessVideo,
                                                    video.id,
                                                    e.target.checked,
                                                  ),
                                                });
                                              }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                          />
                                          <span className="flex-1 truncate">
                                            {video.title}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No videos found for this batch yet.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-gray-50/80 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-xl max-h-[90vh] flex flex-col my-auto overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">Edit User</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editExistingUser();
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={editUser.name}
                    onChange={(e) =>
                      setEditUser({ ...editUser, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={editUser.user_name}
                    onChange={(e) =>
                      setEditUser({ ...editUser, user_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password (optional)"
                      value={editUser.password || ""}
                      onChange={(e) =>
                        setEditUser({ ...editUser, password: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative" ref={editBatchBoxRef}>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Batch
                  </label>
                  <div
                    className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-xl px-2.5 py-1.5 text-sm bg-white cursor-text focus-within:ring-2 focus-within:ring-blue-500"
                    onClick={() => setEditBatchDropdownOpen(true)}
                  >
                    {cleanBatch(editUser.batch).map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        {b}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditUser({
                              ...editUser,
                              batch: toggleBatchChip(editUser.batch, b),
                            });
                          }}
                          className="hover:text-blue-950"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={editBatchSearch}
                      onChange={(e) => {
                        setEditBatchSearch(e.target.value);
                        setEditBatchDropdownOpen(true);
                      }}
                      onFocus={() => setEditBatchDropdownOpen(true)}
                      placeholder={
                        cleanBatch(editUser.batch).length === 0
                          ? "Select batch(es)"
                          : "Add another..."
                      }
                      className="flex-1 min-w-[100px] outline-none text-sm py-0.5"
                    />
                  </div>

                  {editBatchDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                      {(() => {
                        const options = getAvailableBatchOptions()
                          .filter(
                            (batchName) =>
                              !cleanBatch(editUser.batch).includes(batchName),
                          )
                          .filter(
                            (batchName) =>
                              !editBatchSearch.trim() ||
                              batchName
                                .toLowerCase()
                                .includes(
                                  editBatchSearch.trim().toLowerCase(),
                                ),
                          );
                        return options.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-400">
                            No matching batches.
                          </p>
                        ) : (
                          options.map((batchName) => (
                            <button
                              key={batchName}
                              type="button"
                              onClick={() => {
                                setEditUser({
                                  ...editUser,
                                  batch: toggleBatchChip(
                                    editUser.batch,
                                    batchName,
                                  ),
                                });
                                setEditBatchSearch("");
                              }}
                              className="w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              {batchName}
                            </button>
                          ))
                        );
                      })()}
                    </div>
                  )}
                </div>

                {editUser.batch && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Video Access Control
                    </label>

                    {getVideosForBatch(editUser.batch).length > 0 ? (
                      <div className="space-y-3">
                        {getVideoGroupsByBatch(editUser.batch).map((group) => {
                          const groupIds = group.videos.map((v) => v.id);
                          const userAccess = editUser.accessVideo || [];
                          const batchId = getBatchId(group.label);
                          const batchName = getBatchName(group.label);
                          const userFullBatches =
                            Array.isArray(editUser.fullAccessBatches)
                              ? editUser.fullAccessBatches
                              : getFullAccessBatches(editUser.batch, userAccess);
                          const isFullAccessBatch = isBatchInFullAccess(
                            group.label,
                            userFullBatches,
                            userAccess,
                          );
                          const hasSpecificAccess =
                            !isFullAccessBatch &&
                            groupIds.some((id) => userAccess.includes(id));
                          const selectedCount = groupIds.filter((id) =>
                            userAccess.includes(id),
                          ).length;
                          const isExpanded =
                            editExpandedBatchGroup === group.label;

                          return (
                            <div
                              key={group.label}
                              className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-3 shadow-sm"
                            >
                              {/* Batch Header & Mode Controls */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-gray-800">
                                    {group.label}
                                  </span>
                                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {group.videos.length} videos
                                  </span>
                                </div>

                                {/* Mode Selector */}
                                <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg text-xs font-medium">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentFull = Array.isArray(
                                        editUser.fullAccessBatches,
                                      )
                                        ? editUser.fullAccessBatches
                                        : [];
                                      setEditUser({
                                        ...editUser,
                                        fullAccessBatches: [
                                          ...new Set([
                                            ...currentFull,
                                            batchName,
                                          ]),
                                        ],
                                        accessVideo: userAccess.filter(
                                          (id) => !groupIds.includes(id),
                                        ),
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                                      !hasSpecificAccess
                                        ? "bg-white text-blue-700 shadow-sm font-semibold"
                                        : "text-gray-600 hover:text-gray-900"
                                    }`}
                                  >
                                    All Videos (Auto-new)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentFull = (
                                        Array.isArray(editUser.fullAccessBatches)
                                          ? editUser.fullAccessBatches
                                          : []
                                      ).filter(
                                        (b) =>
                                          String(b) !== batchId &&
                                          String(b) !== batchName &&
                                          getBatchName(b).toLowerCase() !==
                                            group.label.toLowerCase(),
                                      );
                                      if (!hasSpecificAccess) {
                                        setEditUser({
                                          ...editUser,
                                          fullAccessBatches: currentFull,
                                          accessVideo: [
                                            ...new Set([
                                              ...userAccess,
                                              ...groupIds,
                                            ]),
                                          ],
                                        });
                                      } else {
                                        setEditUser({
                                          ...editUser,
                                          fullAccessBatches: currentFull,
                                        });
                                      }
                                      setEditExpandedBatchGroup(group.label);
                                    }}
                                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                                      hasSpecificAccess
                                        ? "bg-white text-blue-700 shadow-sm font-semibold"
                                        : "text-gray-600 hover:text-gray-900"
                                    }`}
                                  >
                                    Specific ({selectedCount}/{groupIds.length})
                                  </button>
                                </div>
                              </div>

                              {/* Mode Banner */}
                              {!hasSpecificAccess ? (
                                <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-900 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                      ✨ Full Access Mode
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditExpandedBatchGroup(
                                          isExpanded ? null : group.label,
                                        )
                                      }
                                      className="text-emerald-700 hover:text-emerald-900 font-medium underline text-[11px]"
                                    >
                                      {isExpanded
                                        ? "Hide video list"
                                        : "Preview videos"}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-emerald-700">
                                    Student gets access to{" "}
                                    <strong>
                                      all {group.videos.length} current videos
                                    </strong>{" "}
                                    and any{" "}
                                    <strong>
                                      new videos added in the future
                                    </strong>{" "}
                                    for batch {group.label}.
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-amber-50/90 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex flex-col gap-1.5">
                                  <span className="font-semibold text-amber-800">
                                    🔒 Specific Video Access Mode
                                  </span>
                                  <p className="text-[11px] text-amber-800">
                                    Only checked videos below are accessible.
                                    Future videos added to this batch will stay
                                    locked for this student.
                                  </p>
                                </div>
                              )}

                              {/* Video List */}
                              {(hasSpecificAccess || isExpanded) && (
                                <div className="space-y-2 pt-1 border-t border-gray-100">
                                  {hasSpecificAccess && (
                                    <div className="flex items-center justify-between text-xs pt-1">
                                      <span className="text-gray-600 font-medium text-[11px]">
                                        Select accessible videos:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditUser({
                                              ...editUser,
                                              accessVideo: [
                                                ...new Set([
                                                  ...userAccess,
                                                  ...groupIds,
                                                ]),
                                              ],
                                            })
                                          }
                                          className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                                        >
                                          Check All
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditUser({
                                              ...editUser,
                                              accessVideo: userAccess.filter(
                                                (id) => !groupIds.includes(id),
                                              ),
                                            })
                                          }
                                          className="text-gray-500 hover:text-gray-700 font-medium text-[11px]"
                                        >
                                          Uncheck All (Switch to All)
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                    {group.videos.map((video) => {
                                      const isChecked =
                                        !hasSpecificAccess ||
                                        userAccess.includes(video.id);
                                      return (
                                        <label
                                          key={video.id}
                                          className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                            isChecked
                                              ? "bg-blue-50/80 border border-blue-200/60 text-blue-950 font-medium"
                                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              if (!hasSpecificAccess) {
                                                const currentFull = (
                                                  Array.isArray(editUser.fullAccessBatches)
                                                    ? editUser.fullAccessBatches
                                                    : []
                                                ).filter(
                                                  (b) =>
                                                    String(b) !== batchId &&
                                                    String(b) !== batchName &&
                                                    getBatchName(b).toLowerCase() !==
                                                      group.label.toLowerCase(),
                                                );
                                                const newGroupAccess = e.target.checked
                                                  ? groupIds
                                                  : groupIds.filter((id) => id !== video.id);

                                                setEditUser({
                                                  ...editUser,
                                                  fullAccessBatches: currentFull,
                                                  accessVideo: [
                                                    ...new Set([
                                                      ...userAccess.filter(
                                                        (id) => !groupIds.includes(id),
                                                      ),
                                                      ...newGroupAccess,
                                                    ]),
                                                  ],
                                                });
                                                setEditExpandedBatchGroup(group.label);
                                              } else {
                                                setEditUser({
                                                  ...editUser,
                                                  accessVideo: toggleAccessVideo(
                                                    editUser.accessVideo,
                                                    video.id,
                                                    e.target.checked,
                                                  ),
                                                });
                                              }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                          />
                                          <span className="flex-1 truncate">
                                            {video.title}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No videos found for this batch yet.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Registered Device IDs (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter device IDs or clear to reset"
                    value={editUser.device_id || ""}
                    onChange={(e) =>
                      setEditUser({ ...editUser, device_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={editUser.role}
                    onChange={(e) =>
                      setEditUser({ ...editUser, role: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-gray-50/80 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium shadow-md"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AdminMobileNavBar scrollContainerRef={contentRef} />
    </div>
  );
};

export default AdminManagement;
