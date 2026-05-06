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
  Loader2,
  RotateCw,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-hot-toast";
import { detect } from "detect-browser";
import screenfull from "screenfull";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const VideoPlayer = () => {
  // State declarations
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

  // Hooks and refs
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize player
  useEffect(() => {
    const browser = detect();
    setBrowserInfo(browser);

    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobileDevice(
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      )
    );

    // Initialize security checks
    checkVirtualMachine();
    detectDevTools();
    detectRecordingDevices();

    // Set up periodic security checks
    securityCheckIntervalRef.current = setInterval(() => {
      detectRecordingDevices();
      detectDevTools();
    }, 5000);

    // Set up visibility change detection
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(securityCheckIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (screenfull.isEnabled) {
        screenfull.off("change", handleFullscreenChange);
      }
    };
  }, []);

  // Video element setup
  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;
    videoElement.volume = volume;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      // Auto-play only if no security violations
      if (!Object.values(securityViolation).some(Boolean)) {
        handlePlay().catch(() => {
          // Auto-play failed, show play button
          setIsPlaying(false);
        });
      }
    };

    const handleSeeking = () => setIsSeeking(true);
    const handleSeeked = () => setIsSeeking(false);
    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(videoElement.currentTime);
      }
    };

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
  }, [blobUrl, volume, securityViolation]);

  // Fullscreen handlers
  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on("change", handleFullscreenChange);
    }

    return () => {
      if (screenfull.isEnabled) {
        screenfull.off("change", handleFullscreenChange);
      }
    };
  }, []);

  // Security violation effect
  useEffect(() => {
    if (Object.values(securityViolation).some(Boolean)) {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [securityViolation]);

  // Core functions

  const toggleRotation = async () => {
    try {
      if (!isFullscreen) await toggleFullscreen();
      const newRotation = !isRotated;
      setIsRotated(newRotation);

      if (window.AndroidInterface?.lockOrientation) {
        if (newRotation) {
          // window.AndroidInterface.lockOrientation("landscape");
          setOrientationLocked(true);
        } else {
          // window.AndroidInterface.unlockOrientation();
          setOrientationLocked(false);
        }
      } else {
        // fallback for browsers only
        if (screen.orientation?.lock) {
          try {
            // await screen.orientation.lock(
            //   newRotation ? "landscape" : "portrait"
            // );
            setOrientationLocked(true);
          } catch (err) {
            console.error("Web orientation lock failed:", err);
          }
        }
      }
    } catch (error) {
      setError(error.message);
      toast.error("Rotation failed");
      console.error(error);
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
        // fallback for browser
        const container = containerRef.current;
        if (container?.requestFullscreen) {
          await container.requestFullscreen();
          setIsFullscreen(true);
        } else {
          toast.error("Fullscreen not supported");
        }
      }
    } catch (error) {
      setError1(error.message);
      toast.error("Fullscreen failed");
      console.error(error);
    }
  };
    
  const handleFullscreenChange = () => {
    const isFs =
      screenfull.isFullscreen ||
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;

    setIsFullscreen(isFs);

    if (!isFs) {
      enableBodyScroll(document.body);
      setIsRotated(false);
      if (orientationLocked && screen.orientation?.unlock) {
        screen.orientation.unlock();
        setOrientationLocked(false);
      }
    } else {
      if (isMobileDevice) disableBodyScroll(document.body);
    }
  };

  const handlePlay = async () => {
    try {
      if (Object.values(securityViolation).some(Boolean)) {
        toast.error("Playback blocked due to security restrictions");
        return;
      }
      await videoRef.current.play();
      setIsPlaying(true);
      showPlayPauseEffectAnimation("play");
    } catch (error) {
      console.error("Playback failed:", error);
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

  // Security functions
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

      if (hasRecordingDevice) {
        toast.error("Screen recording detected! Playback disabled.");
      }
    } catch (error) {
      console.error("Error detecting recording devices:", error);
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

    const isVM = vmIndicators.some(
      (indicator) =>
        navigator.userAgent.includes(indicator) ||
        navigator.hardwareConcurrency < 2 ||
        navigator.deviceMemory < 2
    );

    setSecurityViolation((prev) => ({
      ...prev,
      virtualMachine: isVM,
    }));

    if (isVM) {
      toast.error("Virtual machine detected! Playback may be restricted.");
    }
  };

  //hmark-------
  const detectDevTools = () => {
    let threshold = 160;
    const check = () => {
      const start = new Date();
      debugger; // Will cause a noticeable pause if DevTools is open
      const end = new Date();

      if (end - start > threshold) {
        setSecurityViolation((prev) => ({
          ...prev,
          devTools: true,
        }));
        toast.error("Developer tools detected! Playback disabled.");
      }
    };

    // Run check in short intervals
    setInterval(check, 2000);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setSecurityViolation((prev) => ({
        ...prev,
        screenOverlap: true,
      }));
      toast.error("Tab/window switch detected! Playback paused.");
    } else {
      setSecurityViolation((prev) => ({
        ...prev,
        screenOverlap: false,
      }));
    }
  };

  const handleWindowBlur = () => {
    if (!document.hidden) {
      setSecurityViolation((prev) => ({
        ...prev,
        screenOverlap: true,
      }));
      toast.error("Window switch detected! Playback paused.");
    }
  };

  const handleWindowFocus = () => {
    setSecurityViolation((prev) => ({
      ...prev,
      screenOverlap: false,
    }));
  };

  // Event handlers
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

  const handleProgressLeave = () => {
    setHoverTime(null);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleTouchStart = () => {
    setShowControls((prev) => !prev);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
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

  // Helper functions
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
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Calculate video container dimensions with proper rotation support
  const getVideoContainerStyle = () => {
    if (isFullscreen) {
      const baseStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
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
      maxHeight: `${height}px`,
      margin: "0 auto",
      backgroundColor: "#000",
      position: "relative",
      aspectRatio: "16/9",
    };
  };

  // Get video element style with rotation
  const getVideoStyle = () => {
    if (isFullscreen && isRotated) {
      return {
        width: "100vh",
        height: "100vw",
        maxWidth: "100vh",
        maxHeight: "100vw",
        objectFit: "contain",
        transform: "rotate(90deg)",
      };
    }

    return {
      width: "100%",
      height: "100%",
      objectFit: "contain",
    };
  };

  // Get watermark style with rotation
  const getWatermarkStyle = () => {
    if (isFullscreen && isRotated) {
      return {
        position: "absolute",
        top: "50%",
        right: "50%",
        transform: "translate(50%, -50%) rotate(-90deg)",
        transformOrigin: "center center",
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
    }

    return {
      position: "absolute",
      top: "16px",
      right: "16px",
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
    };
  };

  // Get controls style with rotation
  const getControlsStyle = () => {
    const baseStyle = {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background:
        "linear-gradient(to top, rgba(21, 162, 201, 0.8), transparent)",
      padding: "16px",
      transition: "opacity 0.3s ease",
      opacity: showControls ? 1 : 0,
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

  // Fetch video data
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
      } catch (error) {
        console.error("Fetch error:", error);
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

  const handleVideoClick = () => {
      setShowControls(true);
   
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="relative">
                <div style={getWatermarkStyle()}>
                  <Lock className="w-4 h-4" />
                  {watermarkText}
                </div>

                <div
                  ref={containerRef}
                  className="relative bg-black rounded-lg overflow-hidden"
                  style={getVideoContainerStyle()}
                  onMouseMove={isMobileDevice ? undefined : handleMouseMove}
                  onTouchStart={isMobileDevice ? handleTouchStart : undefined}
                  onKeyDown={handleKeyDown}
                  tabIndex="0"
                >
                  <video
                    ref={videoRef}
                    src={blobUrl}
                    style={getVideoStyle()}
                    onClick={handleVideoClick}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                    controls={false}
                    poster="/thumnail.png"
                    webkit-playsinline="true"
                    x-webkit-airplay="allow"
                    x5-video-player-type="h5"
                    x5-video-player-fullscreen="true"
                    x5-video-orientation={isRotated ? "landscape" : "portrait"}
                  />

                  {isSeeking && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="relative">
                        <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-t-transparent border-white rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xs md:text-sm font-semibold"></span>
                        </div>
                      </div>
                    </div>
                  )}

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

                  <div ref={controlsRef} style={getControlsStyle()}>
                    <div
                      ref={progressRef}
                      className="h-2 bg-gray-600 rounded-full mb-3 cursor-pointer relative"
                      onClick={handleProgressClick}
                      onMouseMove={
                        isMobileDevice ? undefined : handleProgressHover
                      }
                      onMouseLeave={
                        isMobileDevice ? undefined : handleProgressLeave
                      }
                      onTouchMove={
                        isMobileDevice ? handleProgressHover : undefined
                      }
                      onTouchEnd={
                        isMobileDevice ? handleProgressLeave : undefined
                      }
                    >
                      <div
                        className="h-full bg-red-500 rounded-full relative"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      >
                        {hoverTime !== null && (
                          <div
                            className="absolute top-0 h-full bg-red-400"
                            style={{
                              width: `${(hoverTime / duration) * 100}%`,
                            }}
                          ></div>
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

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
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

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={toggleMute}
                            className="text-white hover:text-red-400 transition"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? (
                              <VolumeX size={20} />
                            ) : (
                              <Volume2 size={20} />
                            )}
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
                          />
                        </div>

                        <div className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={toggleRotation}
                          className="text-white hover:text-red-400 transition"
                          aria-label={isRotated ? "Normal view" : "Rotate view"}
                        >
                          <RotateCw size={20} />
                        </button>

                        <button
                          onClick={toggleFullscreen}
                          className="text-white hover:text-red-400 transition"
                          aria-label={
                            isFullscreen
                              ? "Exit fullscreen"
                              : "Enter fullscreen"
                          }
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
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 text-sm text-gray-600">
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
              </div>
            </div>
          ) : (
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
