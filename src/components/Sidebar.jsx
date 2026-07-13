import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Upload,
  Video,
  Edit3,
  Award,
  FileEdit,
  AlertTriangle,
  Menu,
  X,
  BookOpen,
  LogOut,
  QrCode,
  FileQuestion,
} from "lucide-react";

const Sidebar = ({ role }) => {
  const navigate = useNavigate()
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed by default
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Don't auto-expand sidebar - let user control it
    };

    handleResize(); // Initial setup
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent horizontal scroll / layout shifts
  useEffect(() => {
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "auto";
    };
  }, []);

  const adminMenuItems = [
    { path: "/admin", icon: Users, label: "Manage Users" },
    { path: "/upload-video", icon: Upload, label: "Video Management" },
    { path: "/videos", icon: Video, label: "Videos" },
    // { path: "/editVideo", icon: Edit3, label: "Edit Videos" },
    // { path: "/uploadCertificate", icon: Award, label: "Certificate" },
    { path: "/editCertificate", icon: FileEdit, label: "Certificate" },
    // { path: "/failedLogin", icon: AlertTriangle, label: "Failed Logins" },
    { path: "/qrgeneration", icon: QrCode, label: "QR Generate" },
    { path: "/quizzes", icon: FileQuestion, label: "Quiz" },
    { path: "/website-users", icon: Users, label: "Website Users" },
  ];

  const studentMenuItems = [
    { path: "/student", icon: BookOpen, label: "Courses" },
  ];

  // Ensure we always have menu items, defaulting to admin if role is undefined
  const effectiveRole = role || "admin";
  const menuItems = effectiveRole === "admin" ? adminMenuItems : studentMenuItems;
  
  
  const shouldShowText = isExpanded;

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsExpanded(false); // Close sidebar on logout
    navigate("/");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-slate-900 text-white transition-all z-50
        ${isExpanded ? "w-64" : "w-16"}
        ${!isExpanded ? "-translate-x-full" : "translate-x-0"}
        duration-300 ease-in-out`}
        style={{
          border: "none",
          boxShadow: "none",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h1
            className={`font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent transition-opacity duration-300 ${
              shouldShowText ? "opacity-100" : "opacity-0"
            }`}
          >
            BIM Education
          </h1>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded hover:bg-slate-800"
          >
            {isExpanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map(({ path, icon: Icon, label }) => {
              // Check if current path matches or starts with the menu item path
              const isActive = 
                location.pathname === path || 
                (path !== "/" && location.pathname.startsWith(path));
              
              return (
                <li key={path}>
                  <button
                    onClick={() => {
                      navigate(path);
                      // Close sidebar after clicking any menu item (both mobile and desktop)
                      setIsExpanded(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                      ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-purple-600"
                          : "hover:bg-slate-700"
                      }`}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span
                      className={`transition-opacity duration-300 ${
                        shouldShowText ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span
              className={`transition-opacity duration-300 ${
                shouldShowText ? "opacity-100" : "opacity-0"
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Toggle button - always visible when sidebar is closed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed top-5 left-5 z-50 bg-white-30 text-black p-2 rounded-lg hover:bg-white-50 shadow-lg"
        >
          <Menu size={20} />
        </button>
      )}
    </>
  );
};

export default Sidebar;