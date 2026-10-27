// routes/websiteQuizRoutes.js
import express from "express";
import {
  // getAvailableQuiz,
  getAllAvailableQuizzes,
  getCoursesWithQuizzes,
  startQuizAttempt,
  getQuizQuestions,
  saveQuizProgress,
  completeQuizAttempt,
  getQuizAttemptHistory,
  getQuizHistoryByUserId,
  getQuizAttemptDetails,
  processQuizPayment,
  verifyQuizPayment,
  checkShowLogin,
  getAttemptProgress,
  syncUserWithQuizSystem
} from "./controllers/websiteQuizController.js";
import { verifyJWTT } from "./middleware/jwtAuth.js";

 

const router = express.Router();

router.use(verifyJWTT);


// Get available quiz for current user type
// router.get("/available-quiz", getAvailableQuiz);
router.get('/available-quizzes', getAllAvailableQuizzes); // Add this line
// Start a new quiz attempt or continue existing
router.post("/start-attempt", startQuizAttempt);

// Get quiz questions (supports both one-by-one and all-at-once)
router.get("/quiz/:quizId/questions", getQuizQuestions);

// Save quiz progress (individual question answers)
router.post("/save-progress", saveQuizProgress);

// Complete quiz attempt and get results
router.post("/complete-attempt", completeQuizAttempt);

// Get quiz attempt history for current user
router.get("/attempt-history", getQuizAttemptHistory);

// Get quiz attempt history for a specific user by id
router.get("/history/:userId", getQuizHistoryByUserId);

// Get detailed results of a specific attempt
router.get("/attempt/:attemptId/details", getQuizAttemptDetails);

// Get current attempt progress (for continuing incomplete attempts)
router.get("/attempt/:attemptId/progress", getAttemptProgress);

router.get('/courses-with-quizzes', getCoursesWithQuizzes);

// Process payment for premium quizzes
router.post("/process-payment", processQuizPayment);

router.post('/verify-payment', verifyQuizPayment); 

// Check if user should be shown login option
router.get("/check-login", checkShowLogin);

// Sync user with quiz system (called after login)
router.post("/sync-user", syncUserWithQuizSystem);

export default router;