import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Loading from "./Loading";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  StepBack,
  StepForward,
  Shield,
  AlertTriangle,
  Lock,
  EyeOff,
  ScreenShareOff,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import {jwtDecode} from "jwt-decode";
import { toast } from "react-hot-toast";
import { detect } from "detect-browser";
import screenfull from "screenfull";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const VideoPlayer = () => {
  // States
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [securityViolation, setSecurityViolation] = useState({
    recording: false,
    screenOverlap: false,
    devTools: false,
    virtualMachine: false,
  });
  const [role, setRole] = useState("");
  const [blobUrl, setBlobUrl] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isRotated, setIsRotated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showPlayPauseEffect, setShowPlayPauseEffect] = useState(false);
  const [showSkipEffect, setShowSkipEffect] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [browserInfo, setBrowserInfo] = useState(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [orientationLocked, setOrientationLocked] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [error, setError] = useState(null);
  const [error1, setError1] = useState(null);

  // Zoom & pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });
  const pinchDistRef = useRef(0);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // React router and refs
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_URL;
  const token = localStorage.getItem("token");
  const id = location.state?.videoId;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsRef = useRef(null);
  const progressRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const securityCheckIntervalRef = useRef(null);

  // Window resize handler
  useEffect(() => {
    const handleResize = () =>
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize
  useEffect(() => {
    const browser = detect();
    setBrowserInfo(browser);

    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobileDevice(
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      )
    );

    checkVirtualMachine();
    detectDevTools();
    detectRecordingDevices();

    securityCheckIntervalRef.current = setInterval(() => {
      detectRecordingDevices();
      detectDevTools();
    }, 5000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(securityCheckIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (screenfull.isEnabled)
        screenfull.off("change", handleFullscreenChange);
    };
  }, []);

  // Video element event handlers
  useEffect(() => {
    if (!videoRef.current) return;
    const videoElement = videoRef.current;
    videoElement.volume = volume;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      if (!Object.values(securityViolation).some(Boolean)) {
        handlePlay().catch(() => setIsPlaying(false));
      }
    };

    const handleSeeking = () => setIsSeeking(true);
    const handleSeeked = () => setIsSeeking(false);
    const handleTimeUpdate = () =>
      !isSeeking && setCurrentTime(videoElement.currentTime);

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("seeking", handleSeeking);
    videoElement.addEventListener("seeked", handleSeeked);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("seeking", handleSeeking);
      videoElement.removeEventListener("seeked", handleSeeked);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl, volume, securityViolation]);

  // Fullscreen change handler
  useEffect(() => {
    if (screenfull.isEnabled) screenfull.on("change", handleFullscreenChange);
    return () => {
      if (screenfull.isEnabled)
        screenfull.off("change", handleFullscreenChange);
    };
  }, []);

  // Security violation enforcement
  useEffect(() => {
    if (Object.values(securityViolation).some(Boolean)) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [securityViolation]);

  // Core functions

  const toggleRotation = async () => {
    try {
      if (!isFullscreen) await toggleFullscreen();
      const newRotation = !isRotated;
      setIsRotated(newRotation);

      if (window.AndroidInterface?.lockOrientation) {
        setOrientationLocked(newRotation);
      } else if (screen.orientation?.lock) {
        try {
          // Not locking orientation here to prevent errors.
          setOrientationLocked(newRotation);
        } catch (err) {
          console.error("Orientation lock failed", err);
        }
      }
    } catch (err) {
      setError(err.message);
      toast.error("Rotation failed");
      console.error(err);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (window.AndroidInterface?.enterFullscreen) {
        if (!isFullscreen) {
          window.AndroidInterface.enterFullscreen();
          setIsFullscreen(true);
        } else {
          window.AndroidInterface.exitFullscreen();
          setIsFullscreen(false);
        }
      } else {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else toast.error("Fullscreen not supported");
      }
    } catch (err) {
      setError1(err.message);
      toast.error("Fullscreen failed");
      console.error(err);
    }
  };

  const handleFullscreenChange = () => {
    const isFs =
      screenfull.isFullscreen ||
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;

    setIsFullscreen(Boolean(isFs));

    if (!isFs) {
      enableBodyScroll(document.body);
      setIsRotated(false);
      if (orientationLocked && screen.orientation?.unlock) {
        screen.orientation.unlock();
        setOrientationLocked(false);
      }
    } else if (isMobileDevice) disableBodyScroll(document.body);
  };

  const handlePlay = async () => {
    if (Object.values(securityViolation).some(Boolean)) {
      toast.error("Playback blocked due to security restrictions");
      return;
    }
    try {
      await videoRef.current.play();
      setIsPlaying(true);
      showPlayPauseEffectAnimation("play");
    } catch {
      toast.success("Click the play button to start video");
    }
  };

  const togglePlay = () => {
    if (videoRef.current.paused) {
      handlePlay();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      showPlayPauseEffectAnimation("pause");
    }
  };

  // Security checks (same as your original, pasted here for completeness)

  const detectRecordingDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasRecordingDevice = devices.some(
        (device) =>
          (device.kind === "videoinput" || device.kind === "audioinput") &&
          device.deviceId !== "default" &&
          device.label &&
          (device.label.toLowerCase().includes("screen") ||
            device.label.toLowerCase().includes("loopback") ||
            device.label.toLowerCase().includes("virtual") ||
            device.label.toLowerCase().includes("recording") ||
            device.label.toLowerCase().includes("audio"))
      );

      setSecurityViolation((prev) => ({
        ...prev,
        recording: hasRecordingDevice,
      }));

      if (hasRecordingDevice)
        toast.error("Screen recording detected! Playback disabled.");
    } catch (err) {
      console.error("Error detecting recording devices:", err);
    }
  };

  const checkVirtualMachine = () => {
    const vmIndicators = [
      "VMware",
      "VirtualBox",
      "Hyper-V",
      "Parallels",
      "QEMU",
      "Xen",
    ];
    const isVM =
      vmIndicators.some((ind) => navigator.userAgent.includes(ind)) ||
      navigator.hardwareConcurrency < 2 ||
      navigator.deviceMemory < 2;

    setSecurityViolation((prev) => ({ ...prev, virtualMachine: isVM }));

    if (isVM)
      toast.error("Virtual machine detected! Playback may be restricted.");
  };

  const detectDevTools = () => {
    let threshold = 160;
    const check = () => {
      const start = new Date();
      debugger; // slows if open
      const end = new Date();

      if (end - start > threshold) {
        setSecurityViolation((prev) => ({ ...prev, devTools: false }));
        toast.error("Developer tools detected! Playback disabled.");
      }
    };
    setInterval(check, 2000);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setSecurityViolation((prev) => ({ ...prev, screenOverlap: true }));
      toast.error("Tab/window switch detected! Playback paused.");
    } else {
      setSecurityViolation((prev) => ({ ...prev, screenOverlap: false }));
    }
  };

  const handleWindowBlur = () => {
    if (!document.hidden) {
      setSecurityViolation((prev) => ({ ...prev, screenOverlap: true }));
      toast.error("Window switch detected! Playback paused.");
    }
  };

  const handleWindowFocus = () => {
    setSecurityViolation((prev) => ({ ...prev, screenOverlap: false }));
  };

  // Controls handlers and UI logic

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const handleProgressHover = (e) => {
    if (isMobileDevice) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const handleProgressLeave = () => setHoverTime(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleTouchStart = () => {
    setShowControls((prev) => !prev);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleKeyDown = (e) => {
    if (Object.values(securityViolation).some(Boolean)) return;

    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "m":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "r":
        e.preventDefault();
        toggleRotation();
        break;
      case "ArrowLeft":
        e.preventDefault();
        skipBackward();
        break;
      case "ArrowRight":
        e.preventDefault();
        skipForward();
        break;
      case "ArrowUp":
        e.preventDefault();
        videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
        setVolume(videoRef.current.volume);
        break;
      case "ArrowDown":
        e.preventDefault();
        videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
        setVolume(videoRef.current.volume);
        break;
      default:
        return;
    }
  };

  // Zoom controls & pan handlers

  const MAX_ZOOM = 3;
  const MIN_ZOOM = 1;

  const zoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)));
  };

  const zoomOut = () => {
    setZoom((z) => {
      const newZoom = +(z - 0.25).toFixed(2);
      if (newZoom < MIN_ZOOM) {
        resetZoomPan();
        return MIN_ZOOM;
      }
      return newZoom;
    });
  };

  const resetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    lastPanRef.current = { x: 0, y: 0 };
  };

  // Mouse drag pan handlers

  const onPointerDown = (e) => {
    if (zoom <= 1) return;

    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e) => {
    if (!isPanning) return;
    e.preventDefault();

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    const newPanX = lastPanRef.current.x + dx;
    const newPanY = lastPanRef.current.y + dy;
    const limit = 100 * zoom;

    setPan({
      x: Math.min(limit, Math.max(-limit, newPanX)),
      y: Math.min(limit, Math.max(-limit, newPanY)),
    });
  };

  const onPointerUp = (e) => {
    if (!isPanning) return;
    e.preventDefault();
    setIsPanning(false);
    lastPanRef.current = pan;
  };

  // Touch handlers (pan + pinch zoom)
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchDistRef.current = getDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && zoom > 1) {
      const t = e.touches[0];
      panStartRef.current = { x: t.clientX, y: t.clientY };
      setIsPanning(true);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      let zoomChange = (dist - pinchDistRef.current) / 200;
      let newZoom = zoomRef.current + zoomChange;
      newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
      setZoom(newZoom);
      pinchDistRef.current = dist;
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - panStartRef.current.x;
      const dy = t.clientY - panStartRef.current.y;

      const newPanX = lastPanRef.current.x + dx;
      const newPanY = lastPanRef.current.y + dy;
      const limit = 100 * zoom;

      setPan({
        x: Math.min(limit, Math.max(-limit, newPanX)),
        y: Math.min(limit, Math.max(-limit, newPanY)),
      });
    }
  };

  const onTouchEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      lastPanRef.current = pan;
    }
  };

  const getDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Play/pause and skip effects helpers

  const showPlayPauseEffectAnimation = (action) => {
    setShowPlayPauseEffect(action);
    setTimeout(() => setShowPlayPauseEffect(false), 500);
  };

  const showSkipEffectAnimation = (direction) => {
    setShowSkipEffect(direction);
    setTimeout(() => setShowSkipEffect(null), 500);
  };

  const skipForward = () => {
    setIsSeeking(true);
    videoRef.current.currentTime = Math.min(
      videoRef.current.currentTime + 10,
      videoRef.current.duration
    );
    showSkipEffectAnimation("forward");
  };

  const skipBackward = () => {
    setIsSeeking(true);
    videoRef.current.currentTime = Math.max(
      videoRef.current.currentTime - 10,
      0
    );
    showSkipEffectAnimation("backward");
  };

  const toggleMute = () => {
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Style helpers

  const getVideoContainerStyle = () => {
    if (isFullscreen) {
      const baseStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100%",
        zIndex: 9999,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

      if (isRotated) {
        return {
          ...baseStyle,
          // transform: "rotate(90deg)",
          transformOrigin: "center center",
        };
      }

      return baseStyle;
    }

    // Normal (non-fullscreen) mode
    const aspectRatio = 16 / 9;
    const maxWidth = windowDimensions.width - 64; // Account for padding
    const maxHeight = windowDimensions.height * 0.8; // 80% of viewport height

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: "100%",
      maxWidth: `${width}px`,
      height: `${height+70}px`,
      margin: "0 auto",
      backgroundColor: "#000",
      position: "relative",
      aspectRatio: "16/9",
    };
  };

const getVideoStyle = () => {
  const transformParts = [
    `scale(${zoom})`,
    `translate(${pan.x}px, ${pan.y}px)`,
  ];

  let style = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "auto",
    transition: isPanning ? "none" : "transform 0.2s ease-out",
    transform: transformParts.join(" "),
    touchAction: "none",
    userSelect: "none",
    borderRadius: "0.25rem",
  };

  if (isFullscreen && isRotated) {
    style = {
      ...style,
      width: "100vh",
      height: "100vw",
      maxWidth: "100vh",
      maxHeight: "100vw",
      transform: `${transformParts.join(" ")} rotate(90deg)`,
    };
  }

  return style;
};

 const getWatermarkStyle = () => {
   const baseStyle = {
     position: "absolute",
     zIndex: 10,
     backgroundColor: "rgba(0, 0, 0, 0.7)",
     color: "white",
     padding: "8px 12px",
     borderRadius: "4px",
     fontSize: "14px",
     fontWeight: "500",
     display: "flex",
     alignItems: "center",
     gap: "8px",
     whiteSpace: "nowrap",
   };

   if (isFullscreen && isRotated) {
     return {
       ...baseStyle,
       transform: "rotate(90deg)",
       transformOrigin: "top right",
       top: "16px",
       left: "16px",
     };
   }

   return {
     ...baseStyle,
     top: "16px",
     right: "16px",
   };
 };


  // Get controls style with rotation
const getControlsStyle = () => {
  const baseStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, rgba(21, 162, 201, 0.8), transparent)",
    padding: "16px",
    transition: "opacity 0.3s ease, visibility 0.3s ease",
    opacity: showControls ? 1 : 0,
    visibility: showControls ? "visible" : "hidden",
    pointerEvents: showControls ? "auto" : "none",
    zIndex: 20,
  };

  if (isFullscreen && isRotated) {
    return {
      ...baseStyle,
      transform: "rotate(90deg)",
      transformOrigin: "center center",
      width: "100vh",
      height: "100px",
      bottom: "calc(50% - 50px)",
      left: "-100%",
      right: "auto",
    };
  }

  return baseStyle;
};

const getBackButtonStyle = () => {
  const baseStyle = {
    position: "absolute",
    top: "16px",
    left: "16px", // base (non-fullscreen) is on the left
    zIndex: 30,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: "9999px",
    padding: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
    color: "white",
    userSelect: "none",
  };

  if (isFullscreen && isRotated) {
    return {
      ...baseStyle,
      position: "fixed", // keep it on screen in fullscreen
      top: "40px",
      left: "auto", // override left
      right: "16px", // move to right side
      transform: "rotate(90deg)",
      transformOrigin: "top right",
    };
  }


  return baseStyle;
};


  // Load video + user info
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`${API_URL}/videos/videoShow/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        setVideo(data.video);
        setBlobUrl(data.video.video_url);

        if (token) {
          const decoded = jwtDecode(token);
          setUserInfo({
            name: decoded.name,
            role: decoded.role,
            id: decoded.id,
          });
          setRole(decoded.role);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        navigate(role === "admin" ? "/admin" : "/student");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchVideo();
  }, [id, token, navigate, role, API_URL]);

  if (loading) return <Loading />;
  if (!video)
    return (
      <div className="flex items-center justify-center h-screen">
        Video not found.
      </div>
    );

  const watermarkText = userInfo
    ? `${userInfo.name} (ID: ${userInfo.id}) - ${userInfo.role}`
    : "Protected Content";

  const isSecurityViolation = Object.values(securityViolation).some(Boolean);

  const handleBack = () => {
    navigate(role === "admin" ? "/videos" : "/student");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={role} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div>{error}</div>
        <div>{error1}</div>

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                <Play className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                {video.title}
              </h1>
            </div>
            <p className="text-gray-600">{video.description}</p>
          </div>

          {isSecurityViolation && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">
                    Security Alert
                  </h3>
                  <p className="text-red-700">
                    {securityViolation.recording &&
                      "Screen recording detected! "}
                    {securityViolation.screenOverlap &&
                      "Window/tab switch detected! "}
                    {securityViolation.devTools && "Developer tools detected! "}
                    {securityViolation.virtualMachine &&
                      "Virtual machine detected! "}
                    Video playback has been disabled for security reasons.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isSecurityViolation ? (
            <div
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative"
              ref={containerRef}
              style={getVideoContainerStyle()}
              onMouseMove={isMobileDevice ? undefined : handleMouseMove}
              onTouchStart={(e) => {
                handleTouchStart();
                onTouchStart(e);
              }}
              onTouchMove={onTouchMove}
              onTouchEnd={(e) => {
                handleTouchStart();
                onTouchEnd(e);
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              tabIndex="0"
              onKeyDown={handleKeyDown}
              aria-label="Video player container"
            >
              {/* Back button */}
              <button
                onClick={handleBack}
                style={getBackButtonStyle()}
                aria-label="Go back"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Watermark */}
              <div style={getWatermarkStyle()}>
                <Lock className="w-4 h-4" />
                {watermarkText}
              </div>

              {/* Video */}
              <video
                ref={videoRef}
                src={blobUrl}
                style={getVideoStyle()}
                onClick={() => setShowControls(true)}
                onEnded={() => setIsPlaying(false)}
                playsInline
                controls={false}
                poster="/thumnail.png"
                webkit-playsinline="true"
                x-webkit-airplay="allow"
                x5-video-player-type="h5"
                x5-video-player-fullscreen="true"
                x5-video-orientation={isRotated ? "landscape" : "portrait"}
                draggable={false}
              />

              {/* Loading spinner */}
              {isSeeking && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="relative">
                    <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-t-transparent border-white rounded-full animate-spin" />
                  </div>
                </div>
              )}

              {/* Play/pause effect */}
              {showPlayPauseEffect && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`bg-black/50 rounded-full p-6 md:p-8 ${
                      isRotated ? "rotate-90" : ""
                    }`}
                  >
                    {showPlayPauseEffect === "play" ? (
                      <Play className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    ) : (
                      <Pause className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    )}
                  </div>
                </div>
              )}

              {/* Skip effect */}
              {showSkipEffect && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 rounded-full p-6 md:p-8">
                    {showSkipEffect === "forward" ? (
                      <StepForward className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    ) : (
                      <StepBack className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    )}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div ref={controlsRef} style={getControlsStyle()}>
                {/* Progress Bar */}
                <div
                  ref={progressRef}
                  className="h-2 bg-gray-600 rounded-full mb-3 cursor-pointer relative flex-grow w-full max-w-full"
                  onClick={handleProgressClick}
                  onMouseMove={isMobileDevice ? undefined : handleProgressHover}
                  onMouseLeave={
                    isMobileDevice ? undefined : handleProgressLeave
                  }
                  onTouchMove={isMobileDevice ? handleProgressHover : undefined}
                  onTouchEnd={isMobileDevice ? handleProgressLeave : undefined}
                  aria-label="Video progress bar"
                  role="slider"
                  tabIndex={0}
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={currentTime}
                >
                  <div
                    className="h-full bg-red-500 rounded-full relative"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  >
                    {hoverTime !== null && (
                      <div
                        className="absolute top-0 h-full bg-red-400"
                        style={{ width: `${(hoverTime / duration) * 100}%` }}
                      />
                    )}
                  </div>
                  {hoverTime !== null && (
                    <div
                      className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none"
                      style={{ left: `${hoverPosition - 20}px` }}
                    >
                      {formatTime(hoverTime)}
                    </div>
                  )}
                </div>

                {/* Bottom controls group */}
                <div className="flex flex-wrap gap-4 justify-between items-center w-full select-none px-2 py-2 rounded-md">
                  {/* Left Controls: Media Controls */}
                  <div
                    className={`flex flex-wrap items-center gap-3 min-w-[250px] ${
                      isRotated
                        ? "flex-1 "
                        : "flex-1 justify-between [@media(min-width:500px)]:justify-center"
                    }`}
                  >
                    <button
                      onClick={skipBackward}
                      className="text-white hover:text-red-400 transition"
                      aria-label="Skip backward 10 seconds"
                    >
                      <StepBack size={20} />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-red-400 transition"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <button
                      onClick={skipForward}
                      className="text-white hover:text-red-400 transition"
                      aria-label="Skip forward 10 seconds"
                    >
                      <StepForward size={20} />
                    </button>

                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-red-400 transition"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <input
                      type="range"
                      ref={volumeSliderRef}
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 accent-red-500"
                      aria-label="Volume control"
                    />

                    <div className="text-white text-sm whitespace-nowrap">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  {/* Right Controls: Zoom, Fullscreen, Rotate */}
                  <div
                    className={`flex flex-wrap items-center gap-3 min-w-[250px] ${
                      isRotated
                        ? "flex-1 "
                        : "flex-1 justify-between [@media(min-width:500px)]:justify-center"
                    }`}
                  >
                    <button
                      onClick={zoomOut}
                      disabled={zoom <= MIN_ZOOM}
                      className="text-white hover:text-red-400 transition disabled:opacity-50"
                      aria-label="Zoom out"
                      title="Zoom out"
                    >
                      <ZoomOut size={20} />
                    </button>

                    <button
                      onClick={resetZoomPan}
                      disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                      className="text-white hover:text-red-400 transition disabled:opacity-50"
                      aria-label="Reset zoom and position"
                      title="Reset zoom & position"
                    >
                      <RefreshCw size={20} />
                    </button>

                    <button
                      onClick={zoomIn}
                      disabled={zoom >= MAX_ZOOM}
                      className="text-white hover:text-red-400 transition disabled:opacity-50"
                      aria-label="Zoom in"
                      title="Zoom in"
                    >
                      <ZoomIn size={20} />
                    </button>

                    <button
                      onClick={toggleRotation}
                      className="text-white hover:text-red-400 transition"
                      aria-label={isRotated ? "Normal view" : "Rotate view"}
                      title={isRotated ? "Normal view" : "Rotate view"}
                    >
                      <RotateCw size={20} />
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      aria-label={
                        isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                      }
                      title={
                        isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                      }
                      className="text-white hover:text-red-400 transition"
                    >
                      {isFullscreen ? (
                        <Minimize size={20} />
                      ) : (
                        <Maximize size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Metadata/info below video */}
              {/* <div className="p-6">
                <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap select-none">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Batch {video.batch}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Protected Content
                  </span>
                  {browserInfo && (
                    <span className="flex items-center gap-1">
                      <ScreenShareOff className="w-4 h-4" />
                      {browserInfo.name} {browserInfo.version}
                    </span>
                  )}
                </div>
              </div> */}
            </div>
          ) : (
            // Security violation message & reload button
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-red-100 rounded-full w-max mx-auto mb-4">
                  <EyeOff className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Playback Disabled
                </h3>
                <p className="text-gray-600 mb-4">
                  Video playback has been disabled due to security concerns:
                </p>
                <ul className="text-left text-gray-600 mb-6 space-y-2">
                  {securityViolation.recording && (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                      Screen recording software detected
                    </li>
                  )}
                  {securityViolation.screenOverlap && (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                      Window/tab switch detected
                    </li>
                  )}
                  {securityViolation.devTools && (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                      Developer tools detected
                    </li>
                  )}
                  {securityViolation.virtualMachine && (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                      Virtual machine detected
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
