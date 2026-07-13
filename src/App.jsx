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
import WebsiteUsers from "./components/WebsiteUsers";


const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />

          {/* Admin Routes with Layout */}
          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/upload-video" element={<UploadVideo />} />
            <Route path="/videos" element={<VideoList />} />
            <Route path="/editVideo" element={<EditVideoList />} />
            <Route path="/uploadCertificate" element={<UploadCertificate />} />
            <Route path="/editCertificate" element={<EditCertificate />} />
            <Route path="/failedLogin" element={<FailedLogin />} />
            <Route path="/qrgeneration" element={<QRGeneration />} />
            <Route path="/quizzes" element={<QuizList />} />
            <Route path="/quizzes/create" element={<CreateQuiz />} />
            <Route path="/quizzes/edit/:quizId" element={<EditQuiz />} />
            <Route path="/quizzes/:quizId/questions" element={<AddQuestions />} />
            <Route path="/quiz/test/:quizId" element={<QuizTest />} />
            <Route path="/website-users" element={<WebsiteUsers />} />
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

