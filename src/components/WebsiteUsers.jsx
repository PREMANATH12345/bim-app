import React, { useEffect, useRef, useState } from "react";
import { 
  Users, 
  Search, 
  Mail, 
  Shield, 
  Calendar,
  Filter,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  CreditCard,
  History,
  X as CloseIcon
} from "lucide-react";
import Loading from "./Loading";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import toast from "react-hot-toast";
import AdminMobileNavBar from "./AdminMobileNavBar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL_USER = import.meta.env.VITE_URL;


const WebsiteUsers = () => {
  const contentRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const token = localStorage.getItem("token");

  const fetchUsers = async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users?page=${page}&limit=${usersPerPage}&search=${debouncedSearchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.totalPages || 1);
        setTotalUsers(data.totalUsers || 0);
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Network error while fetching users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL_USER}/payments/stats/total`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setTotalRevenue(data.totalAmount || 0);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchQuizHistory = async (user) => {
    try {
      setModalLoading(true);
      setSelectedUser(user);
      setShowHistoryModal(true);
      const response = await fetch(`${API_BASE_URL_USER}/website-quiz/history/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setHistoryData(data.history || []);
      } else {
        toast.error(data.message || "Failed to fetch quiz history");
      }
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      toast.error("Network error");
    } finally {
      setModalLoading(false);
    }
  };

  const fetchPaymentHistory = async (user) => {
    try {
      setModalLoading(true);
      setSelectedUser(user);
      setShowPaymentModal(true);
      // Assuming endpoint for payments
      const response = await fetch(`${API_BASE_URL_USER}/payments/user/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setPaymentData(data.payments || []);
      } else {
        toast.error(data.message || "Failed to fetch payment history");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Network error");
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [debouncedSearchTerm, currentPage, usersPerPage]);

  const currentUsers = users;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div ref={contentRef} className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 bg-slate-50 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Website Users</h1>
            </div>
            <p className="text-slate-500">View and manage users registered on the website</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchUsers()}
              className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards (Optional/Mock for premium feel) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Users</h3>
          <p className="text-xl font-bold text-slate-800 mt-1">{totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">New Today</h3>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {(users || []).filter(u => u.created_at && new Date(u.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Total Revenue</span>
          </div>
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Amount</h3>
          <p className="text-xl font-bold text-slate-800 mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email or role..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Show:</span>
              <select
                value={usersPerPage}
                onChange={(e) => {
                  setUsersPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer font-medium text-slate-700"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <button className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Fetching users...</p>
          </div>
        )}

        {/* Empty state (shared) */}
        {!loading && (users || []).length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center">
              <Users className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">No users found matching your search.</p>
            </div>
          </div>
        )}

        {/* Desktop / Tablet Table - hidden on mobile */}
        {!loading && (users || []).length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(users || []).map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-100">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-semibold text-slate-800">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        user.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{formatDate(user.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => fetchPaymentHistory(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-all text-xs font-bold"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Payment
                        </button>
                        <button 
                          onClick={() => fetchQuizHistory(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all text-xs font-bold"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card List - hidden on md and up */}
        {!loading && (users || []).length > 0 && (
          <div className="md:hidden divide-y divide-slate-100">
            {(users || []).map((user) => (
              <div key={user.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-100">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 truncate">{user.name}</div>
                    <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs truncate">{user.email}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    user.role === 'admin' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {user.role === 'admin' && <Shield className="w-3 h-3" />}
                    {user.role.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Joined {formatDate(user.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fetchPaymentHistory(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-all text-xs font-bold"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Payment
                  </button>
                  <button 
                    onClick={() => fetchQuizHistory(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all text-xs font-bold"
                  >
                    <History className="w-3.5 h-3.5" />
                    History
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Showing <span className="text-slate-800">{totalUsers === 0 ? 0 : (currentPage - 1) * usersPerPage + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * usersPerPage, totalUsers)}</span> of <span className="text-slate-800">{totalUsers}</span> users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.max(0, Math.floor(totalPages || 0)))].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                      currentPage === i + 1 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quiz History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Quiz History</h2>
                  <p className="text-sm text-slate-500">{selectedUser?.name}'s attempts</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Loading history...</p>
                </div>
              ) : historyData.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {historyData.map((attempt, index) => (
                    <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            attempt.percentage >= 60 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {attempt.score}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{attempt.quiz_title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(attempt.completed_at)}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                                {attempt.percentage}% Score
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            attempt.percentage >= 60 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {attempt.percentage >= 60 ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <History className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No quiz attempts found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
                  <p className="text-sm text-slate-500">Transactions for {selectedUser?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-10 h-10 text-green-500 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Loading payments...</p>
                </div>
              ) : paymentData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentData.map((payment, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 text-sm font-medium text-slate-600">#{payment.order_id || payment.id}</td>
                          <td className="px-4 py-4 text-sm font-bold text-slate-800">{payment.plan_name || 'Premium Access'}</td>
                          <td className="px-4 py-4 text-sm font-bold text-slate-800">₹{payment.amount}</td>
                          <td className="px-4 py-4 text-sm text-slate-500">{formatDate(payment.created_at)}</td>
                          <td className="px-4 py-4 text-right">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              payment.status === 'captured' || payment.status === 'success' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {payment.status?.toUpperCase() || 'SUCCESS'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <CreditCard className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No payment records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    <AdminMobileNavBar scrollContainerRef={contentRef} />
    </div>
    </div>
  );
};

export default WebsiteUsers;
