import express from "express";
import {
	startView,
	updateView,
	getVideoAnalytics,
	getVideoListForAnalytics,
	trackView,
	trackViewCount,
	listVideos,
	analyticsSummary,
	analyticsUsers,
	listBatches,
	searchStudentWatchHistory,
	getBatchVideosAnalytics,
	getVideosAnalytics,
	contextualUserSearch,
	getWeeklyWatchTrend,
	getWatchTrend,
	getMyWatchStats,
	getViewsByBatch,
	getTopVideos,
} from "./videoviewcontroll.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
// import { verifyToken } from "./middleware/authMiddleware.js"; // uncomment + fix path to match your existing auth middleware

const router = express.Router();

// Student/app side - called from the video player
router.post("/videos/:videoId/view/start", authenticateToken, startView);
router.put("/videos/view/:viewId", updateView);
router.post("/videos/view/:viewId/beacon", updateView);
router.post("/videos/track-view", authenticateToken, trackView);
router.get("/videos/track-view/count", authenticateToken, trackViewCount);
router.get("/videos/list", authenticateToken, listVideos);

// Admin dashboard side - called from Video Management > Analytics
router.get("/videos/analytics-video-list", getVideoListForAnalytics);
router.get("/admin/videos/:videoId/analytics", getVideoAnalytics);
router.get("/videos/:videoId/analytics-summary", analyticsSummary);
router.get("/videos/:videoId/analytics-users", analyticsUsers);
router.get("/batches", authenticateToken, listBatches);
router.get("/admin/users/search-views", authenticateToken, searchStudentWatchHistory);
router.get("/admin/batches/videos-analytics", authenticateToken, getBatchVideosAnalytics);
router.get("/admin/videos/videos-analytics", authenticateToken, getVideosAnalytics);
router.get("/admin/users/search-context", authenticateToken, contextualUserSearch);
router.get("/videos/analytics/weekly-watched", authenticateToken, getWeeklyWatchTrend); // Admin dashboard: last-7-days chart (legacy, kept for compatibility)
router.get("/videos/analytics/watched", authenticateToken, getWatchTrend); // Admin dashboard: Today/This Week/Last 15/This Month/This Year chart
router.get("/videos/analytics/views-by-batch", authenticateToken, getViewsByBatch); // Admin dashboard: Views by Course donut
router.get("/videos/analytics/top-videos", authenticateToken, getTopVideos); // Admin dashboard: Top Videos by Views column chart

// Student side - dashboard stat cards
router.get("/videos/my-watch-stats", authenticateToken, getMyWatchStats);

export default router;