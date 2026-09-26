import { useEffect, useRef, useState } from "react";
import { FileEdit, Globe2, Upload, Users, Video } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/admin", icon: Users, label: "Users" },
  { path: "/upload-video", icon: Upload, label: "Video Management" },
  { path: "/videos", icon: Video, label: "Videos" },
  { path: "/editCertificate", icon: FileEdit, label: "Certificate" },
  { path: "/website-users", icon: Globe2, label: "Website Users" },
];

const AdminMobileNavBar = ({ scrollContainerRef }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) return undefined;

    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      const difference = nextScrollTop - lastScrollTop.current;

      if (nextScrollTop < 8 || difference < -8) setIsVisible(true);
      else if (difference > 8) setIsVisible(false);

      lastScrollTop.current = nextScrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  return (
    <nav
      aria-label="Admin navigation"
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "translate-y-[calc(100%+4rem)]"
      }`}
    >
      <div className="flex items-end justify-between px-2 pb-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isCenter = path === "/videos";

          if (isCenter) {
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className="flex flex-1 flex-col items-center -translate-y-4"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"
                  }`}
                >
                  <Icon size={26} className="text-white" />
                </span>
                <span className={`mt-1 text-[11px] font-medium ${isActive ? "text-purple-700" : "text-gray-500"}`}>
                  {label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="flex flex-1 flex-col items-center gap-1 px-1 py-2"
            >
              <Icon size={20} className={isActive ? "text-purple-600" : "text-gray-400"} />
              <span className={`text-center text-[11px] font-medium leading-3 ${isActive ? "text-purple-600" : "text-gray-500"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AdminMobileNavBar;