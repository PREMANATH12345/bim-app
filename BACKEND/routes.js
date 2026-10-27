// import express from "express";
// import { authenticateToken } from "./middleware/authMiddleware.js";
// import { createUser } from "./controllers/userController.js";
// import { toggleUserStatus } from "./controllers/userController.js";
// import { getUsers } from "./controllers/userController.js";
// import { deleteUser } from "./controllers/userController.js";
// import { loginUser } from "./controllers/authController.js";
// import { editUser } from "./controllers/userController.js";
// import { getFailedLogins } from "./controllers/failedLogin.js";
// import { UserName } from "./controllers/UserDetect.js";
// import { getUserLogs } from "./controllers/authController.js";
// import { getPaymentHistoryByUserId, getTotalPaymentStats } from "./controllers/websiteQuizController.js";
// import { getBatches, addBatch, updateBatch, deleteBatch } from "./controllers/Batch.js";

// //  Quiz Controller
// import {
//   createQuiz,
//   getAllQuizzes,
//   getQuizById,
//   updateQuiz,
//   deleteQuiz,
//   addQuestionToQuiz,
//   getQuestionsByQuizId,
//   updateQuestion,
//   deleteQuestion,
//   getQuizQuestions // Legacy function for backward compatibility
// } from "./controllers/quizController.js";



// const router = express.Router();
// router.put("/users/:id", authenticateToken, editUser);
// router.post("/create", authenticateToken, createUser);
// router.get("/users", authenticateToken, getUsers);
// router.put("/toggleUserStatus/:id/status", authenticateToken, toggleUserStatus);
// router.delete("/delete/:id", authenticateToken, deleteUser);
// router.post("/login", loginUser);
// router.get("/failed-logins",authenticateToken, getFailedLogins);
// router.post("/name", UserName)
// router.get("/userLogs",authenticateToken, getUserLogs);
// router.get("/payments/user/:userId", authenticateToken, getPaymentHistoryByUserId);
// router.get("/payments/stats/total", authenticateToken, getTotalPaymentStats);
// // hmark-----------------------

// // ==================== QUIZ ROUTES ====================
// // Quiz CRUD Operations
// router.post("/quizzes", authenticateToken, createQuiz);                    // Create quiz
// router.get("/quizzes", authenticateToken, getAllQuizzes);                  // Get all quizzes
// router.get("/quizzes/:quizId", authenticateToken, getQuizById);            // Get single quiz
// router.put("/quizzes/:quizId", authenticateToken, updateQuiz);             // Update quiz
// router.delete("/quizzes/:quizId", authenticateToken, deleteQuiz);          // Delete quiz

// // Quiz Questions CRUD Operations
// router.post("/quizzes/:quizId/questions", authenticateToken, addQuestionToQuiz);      // Add question to quiz
// router.get("/quizzes/:quizId/questions", authenticateToken, getQuestionsByQuizId);    // Get all questions for a quiz
// router.put("/questions/:questionId", authenticateToken, updateQuestion);             // Update specific question
// router.delete("/questions/:questionId", authenticateToken, deleteQuestion);          // Delete specific question

// router.get("/batches", authenticateToken, getBatches);
// router.post("/batches", authenticateToken, addBatch);
// router.put("/batches/:id", authenticateToken, updateBatch);
// router.delete("/batches/:id", authenticateToken, deleteBatch);
// // Legacy route (if needed for backward compatibility)
// // router.get("/quiz/:quiz_id/questions", authenticateToken, getQuizQuestions);






// export default router;


import express from "express";
import { authenticateToken } from "./middleware/authMiddleware.js";
import { createUser } from "./controllers/userController.js";
import { toggleUserStatus } from "./controllers/userController.js";
import { getUsers } from "./controllers/userController.js";
import { deleteUser } from "./controllers/userController.js";
import { getMyAccess } from "./controllers/userController.js";

import { loginUser } from "./controllers/authController.js";
import { editUser } from "./controllers/userController.js";
import { getFailedLogins } from "./controllers/failedLogin.js";
import { UserName } from "./controllers/UserDetect.js";
import { getUserLogs } from "./controllers/authController.js";
import { getPaymentHistoryByUserId, getTotalPaymentStats } from "./controllers/websiteQuizController.js";
import { getBatches, addBatch, updateBatch, deleteBatch } from "./controllers/Batch.js";
import { sendMessage, getSentMessages, getMyMessages, submitQuery, getMyQueries, getAllQueries, replyToQuery } from "./controllers/MessageController.js";
//import { listBatches, /* ...your existing imports */ } from "./videoviewcontroll.js";

//  Quiz Controller
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  addQuestionToQuiz,
  getQuestionsByQuizId,
  updateQuestion,
  deleteQuestion,
  getQuizQuestions // Legacy function for backward compatibility
} from "./controllers/quizController.js";

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
} from "./controllers/videoviewcontroll.js";


console.log("ROUTE")
const router = express.Router();
router.put("/users/:id", authenticateToken, editUser);
router.post("/create", authenticateToken, createUser);
router.get("/users/me/access", authenticateToken, getMyAccess);
router.get("/users", authenticateToken, getUsers);
router.put("/toggleUserStatus/:id/status", authenticateToken, toggleUserStatus);
router.delete("/delete/:id", authenticateToken, deleteUser);
router.post("/login", loginUser);
router.get("/failed-logins",authenticateToken, getFailedLogins);
router.post("/name", UserName)
router.get("/userLogs",authenticateToken, getUserLogs);
router.get("/payments/user/:userId", authenticateToken, getPaymentHistoryByUserId);
router.get("/payments/stats/total", authenticateToken, getTotalPaymentStats);
//router.get("/batches", authenticateToken, getBatches);
// hmark-----------------------

// ==================== QUIZ ROUTES ====================
// Quiz CRUD Operations
router.post("/quizzes", authenticateToken, createQuiz);                    // Create quiz
router.get("/quizzes", authenticateToken, getAllQuizzes);                  // Get all quizzes
router.get("/quizzes/:quizId", authenticateToken, getQuizById);            // Get single quiz
router.put("/quizzes/:quizId", authenticateToken, updateQuiz);             // Update quiz
router.delete("/quizzes/:quizId", authenticateToken, deleteQuiz);          // Delete quiz

// Quiz Questions CRUD Operations
router.post("/quizzes/:quizId/questions", authenticateToken, addQuestionToQuiz);      // Add question to quiz
router.get("/quizzes/:quizId/questions", authenticateToken, getQuestionsByQuizId);    // Get all questions for a quiz
router.put("/questions/:questionId", authenticateToken, updateQuestion);             // Update specific question
router.delete("/questions/:questionId", authenticateToken, deleteQuestion);          // Delete specific question

router.get("/batches", authenticateToken, getBatches);
router.post("/batches", authenticateToken, addBatch);
router.put("/batches/:id", authenticateToken, updateBatch);
router.delete("/batches/:id", authenticateToken, deleteBatch);

// ==================== MESSAGES ====================
router.post("/messages", authenticateToken, sendMessage);       // Admin: send a message
router.get("/messages", authenticateToken, getMyMessages);      // Any user: messages addressed to me
router.get("/messages/all", authenticateToken, getSentMessages); // Admin: full send history

// ==================== STUDENT QUERIES ====================
router.post("/messages/query", authenticateToken, submitQuery);              // Student: send a query to admin
router.get("/messages/queries/mine", authenticateToken, getMyQueries);       // Student: my own queries + any reply
router.get("/messages/queries", authenticateToken, getAllQueries);          // Admin: every student query
router.post("/messages/query/:id/reply", authenticateToken, replyToQuery);  // Admin: reply to a query

// Legacy route (if needed for backward compatibility)
// router.get("/quiz/:quiz_id/questions", authenticateToken, getQuizQuestions);

/*Video_View_Controller Route
router.post("/:videoId/view/start", startView);
router.put("/view/:viewId", updateView);
router.get("/:videoId/analytics", getVideoAnalytics);*/

export default router;