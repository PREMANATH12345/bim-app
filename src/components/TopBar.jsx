import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, RefreshCw, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const TopBar = ({ title = "", onBellClick, hasUnread }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const token = localStorage.getItem("token");
  const decodedData = jwtDecode(token);
  const navigate = useNavigate();
  const userName = decodedData.name;
  const role = decodedData.role;

  // For admin pages, nobody passes a `hasUnread` prop (unlike the student
  // dashboard, which manages its own Messages-tab state), so the bell's red
  // dot is computed right here instead: fetch the student queries, compare
  // the newest one's timestamp against what this admin has last "seen"
  // (stored in localStorage, per admin id) — same pattern the student side
  // already uses for its own Messages tab.
  const [autoHasUnread, setAutoHasUnread] = useState(false);

  useEffect(() => {
    if (hasUnread !== undefined) return; // caller manages its own indicator
    if (role !== "admin") return;

    let cancelled = false;
    const API_URL = import.meta.env.VITE_URL;
    const adminId = decodedData?.id;

    fetch(`${API_URL}/messages/queries`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const queries = Array.isArray(data.queries) ? data.queries : [];
        const latest = queries.reduce((max, q) => {
          const t = q.created_at ? new Date(q.created_at).getTime() : 0;
          return t > max ? t : max;
        }, 0);
        const lastSeen =
          Number(localStorage.getItem(`adminQueriesLastSeen_${adminId}`)) || 0;
        setAutoHasUnread(latest > lastSeen);
      })
      .catch(() => {
        // ignore - unread indicator is best-effort only
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread, role, token]);

  const showUnreadDot = hasUnread !== undefined ? hasUnread : autoHasUnread;

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Close the profile dropdown (and hide Logout) whenever the click lands
  // anywhere outside it — only the profile button itself should open it.
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileMenuOpen]);

  // Clicking the bell goes to the Messages page. Pages that already manage
  // their own "messages" tab in place (e.g. the student dashboard) pass
  // onBellClick to switch tabs without a route change; everywhere else this
  // falls back to navigating to each role's messages route.
  const handleBellClick = () => {
    if (onBellClick) {
      onBellClick();
      return;
    }
    if (role === "admin") {
      navigate("/admin-messages");
    } else {
      navigate("/messages");
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Title */}
        <div className="ml-16">
          <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {title}
          </h1>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            type="button"
            onClick={handleBellClick}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {showUnreadDot && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* User Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:from-blue-100 hover:to-purple-100 transition-colors"
            >
              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </span>
              <span className="max-w-24 truncate">{userName}</span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform ${
                  isProfileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isProfileMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg z-50"
                role="menu"
              >
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
