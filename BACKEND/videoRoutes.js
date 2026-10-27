// import express from "express";
// import { uploadVideo } from "./controllers/videoController.js";
// import multer from "multer";
// import { authenticateToken } from "./middleware/authMiddleware.js";
// import { streamVideo } from "./controllers/videoController.js";
// import { getSignedVideos } from "./controllers/videoController.js";
// import { getSignedVideoById } from "./controllers/videoController.js";
// import { getVideosGroupedByBatch } from "./controllers/videoController.js";
// import { getAllVideos } from "./controllers/videoEdit.js";
// import { editVideo } from "./controllers/videoEdit.js";
// import { deleteVideo } from "./controllers/videoEdit.js";
// import { getQuizzesForDropdown } from "./controllers/videoController.js";
// import { updateVideoQuiz } from "./controllers/videoController.js";
// import { 
//   startQuizAttempt, 
//   getQuizAttemptProgress, 
//   saveQuizProgress, 
//   completeQuizAttempt,
//   getQuizAttemptHistory,
//   getQuizAttemptDetails 
// } from "./controllers/quizAttemptController.js";


// const videoRoutes = express.Router();

// // Multer Storage Config
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 1024 },
// });

// // Define Routes
// videoRoutes.post(
//   "/upload",
//   authenticateToken,
//   upload.single("video"),
//   uploadVideo
// );
// videoRoutes.get("/stream-video/:token", streamVideo);
// videoRoutes.get("/videos", authenticateToken, getSignedVideos);
// videoRoutes.get("/videoShow/:id", authenticateToken, getSignedVideoById);
// videoRoutes.get("/videosAll", authenticateToken, getVideosGroupedByBatch);
// videoRoutes.get("/getAllVideo",authenticateToken,getAllVideos);
// videoRoutes.put("/editVideo",authenticateToken,editVideo);
// videoRoutes.delete("/deleteVideo/:id", authenticateToken, deleteVideo);

// // NEW ROUTES for quiz integration
// videoRoutes.get("/quizzes-dropdown", authenticateToken, getQuizzesForDropdown);
// videoRoutes.put("/update-quiz/:id", authenticateToken, updateVideoQuiz);
// //quiz attempt  routes
// // videoRoutes.post("/quiz-attempt", authenticateToken, saveQuizAttempt);
// // videoRoutes.get("/quiz-attempts/:videoId", authenticateToken, getQuizAttempts);
// // Quiz Attempt Tracking Routes
// videoRoutes.get("/start-attempt/:videoId", authenticateToken, startQuizAttempt);
// videoRoutes.get("/quiz-attempt/:attemptId", authenticateToken, getQuizAttemptProgress);
// videoRoutes.post("/save-progress", authenticateToken, saveQuizProgress);
// videoRoutes.post("/complete-attempt", authenticateToken, completeQuizAttempt);
// videoRoutes.get("/quiz-history", authenticateToken, getQuizAttemptHistory);
// videoRoutes.get("/quiz-attempt-details/:attemptId", authenticateToken, getQuizAttemptDetails);

// export default videoRoutes; 



import express from "express";
import { uploadVideo,getS3UploadUrl } from "./controllers/videoController.js";
import multer from "multer";
//New videoview//
//import { startView, updateView, getVideoAnalytics } from "./controllers/videoViewController.js";//
import { authenticateToken } from "./middleware/authMiddleware.js";
import { streamVideo } from "./controllers/videoController.js";
import { getSignedVideos } from "./controllers/videoController.js";
import { getSignedVideoById } from "./controllers/videoController.js";
import { getVideosGroupedByBatch } from "./controllers/videoController.js";
import { getAllVideos } from "./controllers/videoEdit.js";
import { editVideo } from "./controllers/videoEdit.js";
import { deleteVideo } from "./controllers/videoEdit.js";
import { getQuizzesForDropdown } from "./controllers/videoController.js";
import { updateVideoQuiz } from "./controllers/videoController.js";
import { markVideoCompleted, getMyCompletedVideos } from "./controllers/videoController.js";
import { 
  startQuizAttempt, 
  getQuizAttemptProgress, 
  saveQuizProgress, 
  completeQuizAttempt,
  getQuizAttemptHistory,
  getQuizAttemptDetails 
} from "./controllers/quizAttemptController.js";


const videoRoutes = express.Router();

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
});

// Define Routes
videoRoutes.post("/s3-upload-url", authenticateToken, getS3UploadUrl);

videoRoutes.post(
  "/upload",
  authenticateToken,
  upload.single("video"),
  uploadVideo
);
videoRoutes.get("/stream-video/:token", streamVideo);
videoRoutes.get("/videos", authenticateToken, getSignedVideos);
videoRoutes.get("/videoShow/:id", authenticateToken, getSignedVideoById);
videoRoutes.get("/videosAll", authenticateToken, getVideosGroupedByBatch);
videoRoutes.get("/getAllVideo",authenticateToken,getAllVideos);
videoRoutes.get("/completed/mine", authenticateToken, getMyCompletedVideos); // Student: my completed videos
videoRoutes.post("/:id/complete", authenticateToken, markVideoCompleted);    // Student: mark a video completed
videoRoutes.put("/editVideo",authenticateToken,editVideo);
videoRoutes.delete("/deleteVideo/:id", authenticateToken, deleteVideo);

// NEW ROUTES for quiz integration
videoRoutes.get("/quizzes-dropdown", authenticateToken, getQuizzesForDropdown);
videoRoutes.put("/update-quiz/:id", authenticateToken, updateVideoQuiz);
//quiz attempt  routes
// videoRoutes.post("/quiz-attempt", authenticateToken, saveQuizAttempt);
// videoRoutes.get("/quiz-attempts/:videoId", authenticateToken, getQuizAttempts);
// Quiz Attempt Tracking Routes
videoRoutes.get("/start-attempt/:videoId", authenticateToken, startQuizAttempt);
videoRoutes.get("/quiz-attempt/:attemptId", authenticateToken, getQuizAttemptProgress);
videoRoutes.post("/save-progress", authenticateToken, saveQuizProgress);
videoRoutes.post("/complete-attempt", authenticateToken, completeQuizAttempt);
videoRoutes.get("/quiz-history", authenticateToken, getQuizAttemptHistory);
videoRoutes.get("/quiz-attempt-details/:attemptId", authenticateToken, getQuizAttemptDetails);

export default videoRoutes;