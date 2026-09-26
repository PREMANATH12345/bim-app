import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ClipboardList, BookOpen, Award, MessageSquare } from "lucide-react";

// Bottom tab bar shown only on mobile/small screens (hidden on lg+ where the
// left Sidebar is used instead). Order requested: Dashboard, Assignments,
// Courses (raised/bigger center button), Certificates, Messages.
const navItems = [
  { section: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { section: "assignments", icon: ClipboardList, label: "Assignments" },
  { section: "courses", icon: BookOpen, label: "Courses" },
  { section: "certificates", icon: Award, label: "Certificates" },
  { section: "messages", icon: MessageSquare, label: "Messages" },
];

const MobileNavBar = ({ activeSection, onSectionChange, scrollContainerRef }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) return undefined;

    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      const scrollDifference = nextScrollTop - lastScrollTop.current;

      if (nextScrollTop < 8 || scrollDifference < -8) {
        setIsVisible(true);
      } else if (scrollDifference > 8) {
        setIsVisible(false);
      }

      lastScrollTop.current = nextScrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  return (
    <div
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "translate-y-[calc(100%+4rem)]"
      }`}
    >
      <div className="flex items-end justify-between px-2 pb-1">
        {navItems.map(({ section, icon: Icon, label }) => {
          const isActive = activeSection === section;
          const isCenter = section === "courses";

          if (isCenter) {
            // Bigger, raised center button (Courses)
            return (
              <button
                key={section}
                onClick={() => onSectionChange(section)}
                className="flex flex-col items-center -translate-y-4"
              >
                <span
                  className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"
                  }`}
                >
                  <Icon size={26} className="text-white" />
                </span>
                <span
                  className={`text-[11px] mt-1 font-medium ${
                    isActive ? "text-purple-700" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={section}
              onClick={() => onSectionChange(section)}
              className="flex flex-col items-center gap-1 py-2 px-2 flex-1"
            >
              <Icon
                size={20}
                className={isActive ? "text-purple-600" : "text-gray-400"}
              />
              <span
                className={`text-[11px] font-medium ${
                  isActive ? "text-purple-600" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavBar;