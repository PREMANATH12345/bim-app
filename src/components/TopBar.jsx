import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Fingerprint, Laptop, LogOut, RefreshCw, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const isTrustedDeviceEnabled = (device) => device.enabled === true || Number(device.enabled) === 1;

const TopBar = ({ title = "", onBellClick, hasUnread }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [trustedDevicesOpen, setTrustedDevicesOpen] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [trustedDevicesError, setTrustedDevicesError] = useState("");
  const [linkingTrustedDevice, setLinkingTrustedDevice] = useState(false);
  const [updatingTrustedDeviceId, setUpdatingTrustedDeviceId] = useState(null);
  const [trustedLinkEnabled, setTrustedLinkEnabled] = useState(false);
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

  const openTrustedDevices = async () => {
    setIsProfileMenuOpen(false);
    setTrustedDevicesOpen(true);
    setTrustedDevicesError("");
    try {
      const [settingsResponse, devicesResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_URL}/login-method`),
        fetch(`${import.meta.env.VITE_URL}/users/me/trusted-face-devices`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [settingsData, devicesData] = await Promise.all([settingsResponse.json(), devicesResponse.json()]);
      if (!settingsResponse.ok) throw new Error(settingsData.message || "Could not load login settings.");
      if (!devicesResponse.ok) throw new Error(devicesData.message || "Could not load trusted devices.");
      setTrustedLinkEnabled(settingsData.faceMode === "trusted-device" && ["face", "both"].includes(settingsData.loginMethod));
      setTrustedDevices(Array.isArray(devicesData)
        ? devicesData.map((device) => ({ ...device, enabled: isTrustedDeviceEnabled(device) }))
        : []);
    } catch (error) {
      setTrustedDevicesError(error.message || "Could not load trusted devices.");
    }
  };

  const unlinkTrustedDevice = async (deviceId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_URL}/users/me/trusted-face-devices/${deviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not unlink trusted device.");
      setTrustedDevices((current) => current.filter((device) => device.id !== deviceId));
      if (deviceId && trustedDevices.find((device) => device.id === deviceId)?.device_id === localStorage.getItem("device_id")) {
        localStorage.removeItem("face_trust_token");
      }
      setTrustedDevicesError("");
    } catch (error) {
      setTrustedDevicesError(error.message || "Could not unlink trusted device.");
    }
  };

  const toggleTrustedDevice = async (device) => {
    const enabled = !isTrustedDeviceEnabled(device);
    setUpdatingTrustedDeviceId(device.id);
    setTrustedDevicesError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_URL}/users/me/trusted-face-devices/${device.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update trusted-device sign-in.");
      setTrustedDevices((current) => current.map((item) => item.id === device.id ? { ...item, enabled: data.enabled } : item));
    } catch (error) {
      setTrustedDevicesError(error.message || "Could not update trusted-device sign-in.");
    } finally {
      setUpdatingTrustedDeviceId(null);
    }
  };

  const linkCurrentDevice = async () => {
    setLinkingTrustedDevice(true);
    setTrustedDevicesError("");
    try {
      let deviceId = localStorage.getItem("device_id");
      if (!deviceId) {
        deviceId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random()}`;
        localStorage.setItem("device_id", deviceId);
      }
      const response = await fetch(`${import.meta.env.VITE_URL}/users/me/trusted-face-devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ device_id: deviceId, device_name: navigator.userAgent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not link this device.");
      localStorage.setItem("face_trust_token", data.faceTrustToken);
      const refreshed = await fetch(`${import.meta.env.VITE_URL}/users/me/trusted-face-devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshedData = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedData.message || "Device linked, but the list could not be refreshed.");
      setTrustedDevices(Array.isArray(refreshedData)
        ? refreshedData.map((device) => ({ ...device, enabled: isTrustedDeviceEnabled(device) }))
        : []);
    } catch (error) {
      setTrustedDevicesError(error.message || "Could not link this device.");
    } finally {
      setLinkingTrustedDevice(false);
    }
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
                  onClick={openTrustedDevices}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <Fingerprint size={16} />
                  Trusted devices
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
      {trustedDevicesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setTrustedDevicesOpen(false);
        }}>
          <section aria-labelledby="trusted-device-dialog-title" aria-modal="true" role="dialog" className="w-full max-w-lg border border-gray-200 bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 id="trusted-device-dialog-title" className="text-lg font-semibold text-gray-900">Trusted devices</h2>
              <div className="flex items-center gap-2">
                {trustedLinkEnabled && (
                  <button type="button" onClick={linkCurrentDevice} disabled={linkingTrustedDevice} className="inline-flex items-center gap-2 bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
                    <Laptop size={16} />
                    {linkingTrustedDevice ? "Linking..." : "Link this device"}
                  </button>
                )}
                <button type="button" onClick={() => setTrustedDevicesOpen(false)} aria-label="Close trusted devices" className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                  <X size={18} />
                </button>
              </div>
            </header>
            {trustedDevicesError && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">{trustedDevicesError}</p>}
            <div className="max-h-80 divide-y divide-gray-200 overflow-y-auto">
              {trustedDevices.length ? trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center gap-3 px-5 py-4">
                  <Fingerprint className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{device.device_name}</p>
                    <p className="mt-1 text-xs text-gray-500">Last used {device.last_used_at ? new Date(device.last_used_at).toLocaleString() : "date unavailable"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">Single-time sign-in</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isTrustedDeviceEnabled(device)}
                      aria-label={`${isTrustedDeviceEnabled(device) ? "Disable" : "Enable"} single-time sign-in for ${device.device_name}`}
                      onClick={() => toggleTrustedDevice(device)}
                      disabled={updatingTrustedDeviceId === device.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center transition-colors disabled:cursor-wait disabled:opacity-60 ${isTrustedDeviceEnabled(device) ? "bg-emerald-700" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 bg-white transition-transform ${isTrustedDeviceEnabled(device) ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <button type="button" onClick={() => unlinkTrustedDevice(device.id)} className="px-2 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Unlink</button>
                </div>
              )) : (
                <p className="px-5 py-8 text-center text-sm text-gray-500">No trusted devices are linked to this account.</p>
              )}
            </div>
            <p className="border-t border-gray-200 px-5 py-3 text-xs text-gray-500">Unlinking a browser means it must verify the account’s face again at sign-in.</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default TopBar;
