import { useRef, useCallback, useEffect } from "react";

// Usage inside VideoPlayer.jsx:
//   const { onPlay, onTimeUpdate, onPauseOrEnd } = useVideoTracking(videoId, userId);
//   <video ref={videoRef} onPlay={onPlay} onTimeUpdate={onTimeUpdate} onPause={onPauseOrEnd} onEnded={onPauseOrEnd} />

const MIN_WATCH_SECONDS = 10;

function detectDeviceType() {
  const ua = navigator.userAgent || "";
  if (/ipad|tablet/i.test(ua) || (/(Android)(?!.*Mobile)/i.test(ua))) return "Tablet";
  if (/mobi|iphone|android|ipad|ipod|phone/i.test(ua)) return "Mobile";
  return "Desktop";
}

export default function useVideoTracking(videoId, userId, options = {}) {
  const apiUrl = (options.apiUrl || (import.meta && import.meta.env && import.meta.env.VITE_URL)) || "";
  const token = localStorage.getItem("token");

  const startedAtRef = useRef(null);
  const lastReportedSecondsRef = useRef(0);
  const endedSentRef = useRef(false);

  const ensureHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const getViewCount = async () => {
    // Try a known count endpoint; backend may vary so handle gracefully
    try {
      const url = `${apiUrl}/videos/track-view/count?videoId=${encodeURIComponent(videoId)}&userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url, { headers: ensureHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data === "number") return data;
      if (data && typeof data.count === "number") return data.count;
      if (data && typeof data.total === "number") return data.total;
      return null;
    } catch (err) {
      console.warn("Could not fetch view count", err);
      return null;
    }
  };

  const postTrackView = async (payload, useBeacon = false) => {
    const url = `${apiUrl}/videos/track-view`;
    try {
      const body = JSON.stringify(payload);
      if (useBeacon && navigator.sendBeacon) {
        // sendBeacon doesn't support headers; send minimal payload
        try {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon(url, blob);
          return true;
        } catch (err) {
          // fallback to fetch
        }
      }
      await fetch(url, { method: "POST", headers: ensureHeaders(), body });
      return true;
    } catch (err) {
      console.error("Failed to post track view", err);
      return false;
    }
  };

  const onPlay = useCallback(() => {
    // record start time when playback begins
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
      lastReportedSecondsRef.current = 0;
      endedSentRef.current = false;
    }
  }, []);

  const onTimeUpdate = useCallback((e) => {
    const seconds = Math.floor(e.target.currentTime || 0);
    // Throttle internal last reported seconds
    if (seconds - lastReportedSecondsRef.current >= 15) {
      lastReportedSecondsRef.current = seconds;
    }
    // no network here; we only use onPauseOrEnd to send
  }, []);

  const sendIfQualifies = useCallback(async (currentTimeSeconds) => {
    if (!startedAtRef.current) return false;
    const endedAt = new Date().toISOString();
    const watchDurationSeconds = Math.floor(currentTimeSeconds || lastReportedSecondsRef.current || 0);
    if (watchDurationSeconds < (options.minWatchSeconds || MIN_WATCH_SECONDS)) return false;

    // determine device type
    const deviceType = detectDeviceType();

    // compute view number (current count + 1)
    let viewNumber = 1;
    const count = await getViewCount();
    if (typeof count === "number") viewNumber = count + 1;

    const payload = {
      userId,
      videoId,
      viewNumber,
      watchDurationSeconds,
      deviceType,
      startedAt: startedAtRef.current,
      endedAt,
    };

    const success = await postTrackView(payload, true);
    return success;
  }, [videoId, userId, options.minWatchSeconds]);

  const onPauseOrEnd = useCallback((e) => {
    if (endedSentRef.current) return;
    const currentSeconds = Math.floor(e?.target?.currentTime || lastReportedSecondsRef.current || 0);
    sendIfQualifies(currentSeconds).then(() => {
      endedSentRef.current = true;
      // reset start so repeated plays are new views
      startedAtRef.current = null;
      lastReportedSecondsRef.current = 0;
    });
  }, [sendIfQualifies]);

  useEffect(() => {
    const handleBeforeUnload = (ev) => {
      if (endedSentRef.current) return;
      const seconds = lastReportedSecondsRef.current || 0;
      // Try send with beacon (no headers)
      if (!startedAtRef.current) return;
      const endedAt = new Date().toISOString();
      const watchDurationSeconds = Math.floor(seconds);
      if (watchDurationSeconds < (options.minWatchSeconds || MIN_WATCH_SECONDS)) return;
      const payload = {
        userId,
        videoId,
        viewNumber: 0, // unknown, backend can compute if needed
        watchDurationSeconds,
        deviceType: detectDeviceType(),
        startedAt: startedAtRef.current,
        endedAt,
      };
      try {
        const body = JSON.stringify(payload);
        const blob = new Blob([body], { type: "application/json" });
        // try beacon first
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`${apiUrl}/videos/track-view`, blob);
          endedSentRef.current = true;
          return;
        }
      } catch (err) {
        // noop
      }
      // fallback to synchronous fetch with keepalive
      try {
        fetch(`${apiUrl}/videos/track-view`, { method: "POST", headers: ensureHeaders(), body: JSON.stringify(payload), keepalive: true });
        endedSentRef.current = true;
      } catch (err) {
        console.warn("Failed to send on unload", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // when tab hidden, attempt to send
        const seconds = lastReportedSecondsRef.current || 0;
        if (seconds > 0) sendIfQualifies(seconds).then(() => { endedSentRef.current = true; });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [apiUrl, sendIfQualifies, userId, videoId, options.minWatchSeconds]);

  return { onPlay, onTimeUpdate, onPauseOrEnd };
}
