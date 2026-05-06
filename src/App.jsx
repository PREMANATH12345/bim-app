import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import StudentDashboard from "./components/StudentDashboard";
import UploadVideo from "./components/UploadVideo";
import VideoList from "./components/VideoList";
import EditVideoList from "./components/EditVideo";
import UploadCertificate from "./components/UploadCertificate";
import EditCertificate from "./components/EditCertificate";
import FailedLogin from "./components/FailedLogin";
import VideoPlayer from "./components/VideoPlayer";
import PrivateRoute from "./components/PrivateRoute";
import DashboardLayout from "./components/DashboardLayout";
import QRGeneration from "./components/QRGeneration";
import QuizList from "./components/QuizList";
import CreateQuiz from "./components/CreateQuiz";
import AddQuestions from "./components/AddQuestions";
import EditQuiz from "./components/EditQuiz";
import QuizTest from "./components/QuizTest";
import QuizHistoryPage from "./components/QuizHistoryPage";
import QuizPage from "./components/QuizPage";


const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />

          {/* Admin Routes with Layout */}
          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route
              path="/admin"
              element={
                <DashboardLayout role="admin">
                  <AdminDashboard />
                </DashboardLayout>
              }
            />
            <Route
              path="/upload-video"
              element={
                <DashboardLayout role="admin">
                  <UploadVideo />
                </DashboardLayout>
              }
            />
            <Route
              path="/videos"
              element={
                <DashboardLayout role="admin">
                  <VideoList />
                </DashboardLayout>
              }
            />
            <Route
              path="/editVideo"
              element={
                <DashboardLayout role="admin">
                  <EditVideoList />
                </DashboardLayout>
              }
            />
            <Route
              path="/uploadCertificate"
              element={
                <DashboardLayout role="admin">
                  <UploadCertificate />
                </DashboardLayout>
              }
            />
            <Route
              path="/editCertificate"
              element={
                <DashboardLayout role="admin">
                  <EditCertificate />
                </DashboardLayout>
              }
            />
            <Route
              path="/failedLogin"
              element={
                <DashboardLayout role="admin">
                  <FailedLogin />
                </DashboardLayout>
              }
            />
            {/* hmark----------------- */}
            <Route
              path="/qrgeneration"
              element={
                <DashboardLayout role="admin">
                  <QRGeneration />
                </DashboardLayout>
              }
            />
            {/* Quiz Management Routes */}
            <Route
              path="/quizzes"
              element={
                <DashboardLayout role="admin">
                  <QuizList />
                </DashboardLayout>
              }
            />
            <Route
              path="/quizzes/create"
              element={
                <DashboardLayout role="admin">
                  <CreateQuiz />
                </DashboardLayout>
              }
            />
            <Route
              path="/quizzes/edit/:quizId"
              element={
                <DashboardLayout role="admin">
                  <EditQuiz />
                </DashboardLayout>
              }
            />
            <Route
              path="/quizzes/:quizId/questions"
              element={
                <DashboardLayout role="admin">
                  <AddQuestions />
                </DashboardLayout>
              }
            />
            <Route
              path="/quiz/test/:quizId"
              element={
                <DashboardLayout role="admin">
                  <QuizTest />
                </DashboardLayout>
              }
            />
          </Route>

          {/* Shared Routes with Layout */}
          <Route element={<PrivateRoute allowedRoles={["admin", "student"]} />}>
            <Route
              path="/video"
              element={
                <DashboardLayout role="shared">
                  <VideoPlayer />
                </DashboardLayout>
              }
            />
            <Route
              path="/student"
              element={
                <DashboardLayout role="student">
                  <StudentDashboard />
                </DashboardLayout>
              }
            />
            {/* video quiz routes */}
            <Route
              path="/quiz"
              element={
                <DashboardLayout role="shared">
                  <QuizPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/quiz-history"
              element={
                <DashboardLayout role="shared">
                  <QuizHistoryPage />
                </DashboardLayout>
              }
            />
          </Route>

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold text-red-600">
                  404 - Page Not Found
                </h1>
                <p className="text-gray-600 mt-2">
                  The page you are looking for doesn't exist.
                </p>
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

