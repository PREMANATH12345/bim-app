// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Login from "./components/Login";
// import AdminDashboard from "./components/AdminDashboard";
// import StudentDashboard from "./components/StudentDashboard";
// import UploadVideo from "./components/UploadVideo";
// import VideoList from "./components/VideoList";
// import EditVideoList from "./components/EditVideo";
// import UploadCertificate from "./components/UploadCertificate";
// import EditCertificate from "./components/EditCertificate";
// import FailedLogin from "./components/FailedLogin";
// import VideoPlayer from "./components/VideoPlayer";
// import PrivateRoute from "./components/PrivateRoute";
// import DashboardLayout from "./components/DashboardLayout";
// import QRGeneration from "./components/QRGeneration";
// import AdminMessages from "./components/AdminMessages";
// import QuizList from "./components/QuizList";
// import CreateQuiz from "./components/CreateQuiz";
// import AddQuestions from "./components/AddQuestions";
// import EditQuiz from "./components/EditQuiz";
// import QuizTest from "./components/QuizTest";
// import QuizHistoryPage from "./components/QuizHistoryPage";
// import QuizPage from "./components/QuizPage";
// import WebsiteUsers from "./components/WebsiteUsers";
// import VideoAnalytics from "./components/VideoAnalytics";

// const App = () => {
//   return (
//     <Router>
//       <div className="app-container">
//         <Routes>
//           {/* Public Routes */}
//           <Route path="/" element={<Login />} />

//           {/* Admin Routes with Layout */}
//           <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
//             <Route path="/admin" element={<AdminDashboard />} />
//             <Route path="/upload-video" element={<UploadVideo />} />
//             <Route path="/videos" element={<VideoList />} />
//             <Route path="/video-analytics" element={<VideoAnalytics />}/>
//             <Route path="/video-analytics/:videoId?" element={<VideoAnalytics />} />
//             <Route path="/editVideo" element={<EditVideoList />} />
//             <Route path="/uploadCertificate" element={<UploadCertificate />} />
//             <Route path="/editCertificate" element={<EditCertificate />} />
//             <Route path="/failedLogin" element={<FailedLogin />} />
//             <Route path="/qrgeneration" element={<QRGeneration />} />
//             <Route path="/admin-messages" element={<AdminMessages />} />
//             <Route path="/quizzes" element={<QuizList />} />
//             <Route path="/quizzes/create" element={<CreateQuiz />} />
//             <Route path="/quizzes/edit/:quizId" element={<EditQuiz />} />
//             <Route path="/quizzes/:quizId/questions" element={<AddQuestions />} />
//             <Route path="/quiz/test/:quizId" element={<QuizTest />} />
//             <Route path="/website-users" element={<WebsiteUsers />} />
//           </Route>

//           {/* Shared Routes with Layout */}
//           <Route element={<PrivateRoute allowedRoles={["admin", "student"]} />}>
//             <Route
//               path="/video"
//               element={
//                 <DashboardLayout role="shared">
//                   <VideoPlayer />
//                 </DashboardLayout>
//               }
//             />
//             <Route
//               path="/student"
//               element={<StudentDashboard />}
//             />
//             {/* video quiz routes */}
//             <Route
//               path="/quiz"
//               element={
//                 <DashboardLayout role="shared">
//                   <QuizPage />
//                 </DashboardLayout>
//               }
//             />
//             <Route
//               path="/quiz-history"
//               element={
//                 <DashboardLayout role="shared">
//                   <QuizHistoryPage />
//                 </DashboardLayout>
//               }
//             />

//             {/* Student pages share the same workspace and top bar. */}
//             <Route
//               path="/dashboard"
//               element={<StudentDashboard />}
//             />
//             <Route
//               path="/assignments"
//               element={<StudentDashboard />}
//             />
//             <Route
//               path="/certificates"
//               element={<StudentDashboard />}
//             />
//             <Route
//               path="/messages"
//               element={<StudentDashboard />}
//             />
//           </Route>

//           {/* 404 Not Found */}
//           <Route
//             path="*"
//             element={
//               <div className="min-h-screen flex flex-col items-center justify-center">
//                 <h1 className="text-3xl font-bold text-red-600">
//                   404 - Page Not Found
//                 </h1>
//                 <p className="text-gray-600 mt-2">
//                   The page you are looking for doesn't exist.
//                 </p>
//               </div>
//             }
//           />
//         </Routes>
//       </div>
//     </Router>
//   );
// };

// export default App;


import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import AdminHomeDashboard from "./components/AdminHomeDashboard";
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
import AdminMessages from "./components/AdminMessages";
import QuizList from "./components/QuizList";
import CreateQuiz from "./components/CreateQuiz";
import AddQuestions from "./components/AddQuestions";
import EditQuiz from "./components/EditQuiz";
import QuizTest from "./components/QuizTest";
import QuizHistoryPage from "./components/QuizHistoryPage";
import QuizPage from "./components/QuizPage";
import WebsiteUsers from "./components/WebsiteUsers";
import VideoAnalytics from "./components/VideoAnalytics";

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />

          {/* Admin Routes with Layout */}
          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/admin-dashboard" element={<AdminHomeDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/upload-video" element={<UploadVideo />} />
            <Route path="/videos" element={<VideoList />} />
            <Route path="/video-analytics" element={<VideoAnalytics />}/>
            <Route path="/video-analytics/:videoId?" element={<VideoAnalytics />} />
            <Route path="/editVideo" element={<EditVideoList />} />
            <Route path="/uploadCertificate" element={<UploadCertificate />} />
            <Route path="/editCertificate" element={<EditCertificate />} />
            <Route path="/failedLogin" element={<FailedLogin />} />
            <Route path="/qrgeneration" element={<QRGeneration />} />
            <Route path="/admin-messages" element={<AdminMessages />} />
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
              element={<StudentDashboard />}
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

            {/* Student pages share the same workspace and top bar. */}
            <Route
              path="/dashboard"
              element={<StudentDashboard />}
            />
            <Route
              path="/assignments"
              element={<StudentDashboard />}
            />
            <Route
              path="/certificates"
              element={<StudentDashboard />}
            />
            <Route
              path="/messages"
              element={<StudentDashboard />}
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