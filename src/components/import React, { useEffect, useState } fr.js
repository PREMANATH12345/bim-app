// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { toast } from 'react-hot-toast';
// import { jwtDecode } from "jwt-decode";
// import {
//   ChevronLeft,
//   ChevronRight,
//   Check,
//   X,
//   Flag,
//   Save,
//   FileText,
//   BookOpen,
//   ArrowLeft
// } from "lucide-react";
// import Loading from "./Loading";

// const QuizPage = () => {
//   // Get video ID from URL params
//   const { videoId } = useParams();
//   const navigate = useNavigate();
//   const API_URL = import.meta.env.VITE_URL;
//   const token = localStorage.getItem("token");

//   // States
//   const [video, setVideo] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [userInfo, setUserInfo] = useState(null);
//   const [role, setRole] = useState("");
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [quizAnswers, setQuizAnswers] = useState({});
//   const [showQuizResults, setShowQuizResults] = useState(false);
//   const [quizScore, setQuizScore] = useState(0);
//   const [quizSubmitted, setQuizSubmitted] = useState(false);

//   // Load video and user info
//   useEffect(() => {
//     const fetchVideo = async () => {
//       try {
//         const response = await fetch(`${API_URL}/videos/videoShow/${videoId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!response.ok) throw new Error(`Error: ${response.status}`);

//         const data = await response.json();
//         setVideo(data.video);

//         if (token) {
//           const decoded = jwtDecode(token);
//           setUserInfo({
//             name: decoded.name,
//             role: decoded.role,
//             id: decoded.id,
//           });
//           setRole(decoded.role);
//         }
//       } catch (err) {
//         console.error("Fetch error:", err);
//         toast.error("Failed to load quiz data");
//         navigate("/videos");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (videoId && token) {
//       fetchVideo();
//     } else {
//       navigate("/videos");
//     }
//   }, [videoId, token, navigate, API_URL]);

//   // Quiz functions
//   const handleAnswerChange = (questionId, selectedOption) => {
//     setQuizAnswers(prev => ({
//       ...prev,
//       [questionId]: selectedOption
//     }));
//   };

//   const handleNextQuestion = () => {
//     if (currentQuestionIndex < video.quiz.questions.length - 1) {
//       setCurrentQuestionIndex(currentQuestionIndex + 1);
//     }
//   };

//   const handlePreviousQuestion = () => {
//     if (currentQuestionIndex > 0) {
//       setCurrentQuestionIndex(currentQuestionIndex - 1);
//     }
//   };

//   const handleGoToQuestion = (index) => {
//     setCurrentQuestionIndex(index);
//   };

//   const handleSubmitQuiz = () => {
//     const ConfirmToast = ({ closeToast }) => (
//       <div>
//         <p className="font-medium">Are you sure you want to submit the quiz?</p>
//         <p className="text-sm mb-4">You cannot change your answers after submission.</p>
//         <div className="flex justify-end gap-2">
//           <button
//             onClick={() => {
//               calculateQuizScore();
//               setQuizSubmitted(true);
//               setShowQuizResults(true);
//               closeToast();
//             }}
//             className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
//           >
//             Submit
//           </button>
//           <button
//             onClick={closeToast}
//             className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     );

//     toast(<ConfirmToast />, {
//       position: "top-center",
//       autoClose: false,
//       closeButton: false,
//       closeOnClick: false,
//       draggable: false,
//       className: "w-full max-w-md"
//     });
//   };

//   const calculateQuizScore = () => {
//     let correctAnswers = 0;
//     video.quiz.questions.forEach(question => {
//       if (quizAnswers[question.question_id] === question.correct_option) {
//         correctAnswers++;
//       }
//     });
//     setQuizScore(correctAnswers);
//     toast.success(`Quiz submitted! Your score: ${correctAnswers}/${video.quiz.questions.length}`, {
//       position: "top-center",
//       autoClose: 5000,
//     });
//   };

//   const handleBackToVideos = () => {
//     navigate("/videos");
//   };

//   if (loading) return <Loading />;

//   if (!video || !video.quiz) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <h1 className="text-2xl font-bold text-gray-800 mb-4">Quiz Not Found</h1>
//           <p className="text-gray-600 mb-6">The requested quiz could not be found.</p>
//           <button
//             onClick={handleBackToVideos}
//             className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//           >
//             Back to Videos
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const questions = video.quiz.questions || [];
//   const currentQuestion = questions[currentQuestionIndex];
//   const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
//   const answeredCount = Object.keys(quizAnswers).length;

//   // Quiz Results View
//   if (showQuizResults) {
//     return (
//       <div className="min-h-screen bg-gray-50 py-8">
//         <div className="max-w-4xl mx-auto px-4">
//           {/* Header */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
//             <div className="flex items-center justify-between mb-4">
//               <h1 className="text-2xl font-bold text-gray-800">Quiz Results</h1>
//               <button
//                 onClick={handleBackToVideos}
//                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
//               >
//                 <ArrowLeft size={18} />
//                 Back to Videos
//               </button>
//             </div>
//             <p className="text-gray-600">Quiz: {video.quiz.title}</p>
//           </div>

//           {/* Score Display */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
//             <div className="text-center mb-8">
//               <h2 className="text-3xl font-bold text-gray-800 mb-6">Your Results</h2>
//               <div className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-6">
//                 <div className="text-6xl font-bold mb-2">
//                   <span className="text-blue-600">{quizScore}</span>
//                   <span className="text-gray-400">/{questions.length}</span>
//                 </div>
//                 <div className="text-xl text-gray-700">
//                   Score: {((quizScore / questions.length) * 100).toFixed(1)}%
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Question Review */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
//               <BookOpen className="w-5 h-5 text-blue-500" />
//               Question Review
//             </h3>
//             <div className="space-y-6">
//               {questions.map((question, index) => {
//                 const userAnswer = quizAnswers[question.question_id];
//                 const isCorrect = userAnswer === question.correct_option;
//                 return (
//                   <div
//                     key={question.question_id}
//                     className={`border rounded-xl p-5 transition-all duration-200 ${
//                       isCorrect
//                         ? 'border-green-300 bg-green-50 hover:bg-green-100'
//                         : 'border-red-300 bg-red-50 hover:bg-red-100'
//                     }`}
//                   >
//                     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
//                       <h4 className="font-medium text-gray-800">
//                         <span className="font-bold">Q{index + 1}:</span> {question.question_text}
//                       </h4>
//                       <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//                         isCorrect
//                           ? 'bg-green-200 text-green-800'
//                           : 'bg-red-200 text-red-800'
//                       }`}>
//                         {isCorrect ? 'Correct' : 'Incorrect'}
//                       </span>
//                     </div>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
//                       {['A', 'B', 'C', 'D'].map(option => (
//                         <div
//                           key={option}
//                           className={`p-3 rounded-lg border transition-all duration-200 ${
//                             option === question.correct_option
//                               ? 'bg-green-100 border-green-400'
//                               : option === userAnswer && option !== question.correct_option
//                                 ? 'bg-red-100 border-red-400'
//                                 : 'bg-gray-50 border-gray-200'
//                           }`}
//                         >
//                           <div className="flex items-center">
//                             <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-3 ${
//                               option === question.correct_option
//                                 ? 'bg-green-500 text-white'
//                                 : option === userAnswer && option !== question.correct_option
//                                   ? 'bg-red-500 text-white'
//                                   : 'bg-gray-200 text-gray-700'
//                             }`}>
//                               {option}
//                             </span>
//                             <span>{question[`option_${option.toLowerCase()}`]}</span>
//                             {option === question.correct_option && (
//                               <Check className="ml-auto w-5 h-5 text-green-500" />
//                             )}
//                             {option === userAnswer && option !== question.correct_option && (
//                               <X className="ml-auto w-5 h-5 text-red-500" />
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                     <div className="text-sm text-gray-600 space-y-2">
//                       <div>
//                         <span className="font-medium">Your Answer: </span>
//                         {userAnswer ? (
//                           <span className={`px-2 py-1 rounded ${
//                             isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                           }`}>
//                             Option {userAnswer}
//                           </span>
//                         ) : (
//                           <span className="text-gray-500">Not answered</span>
//                         )}
//                       </div>
//                       <div>
//                         <span className="font-medium">Correct Answer: </span>
//                         <span className="px-2 py-1 rounded bg-green-100 text-green-800">
//                           Option {question.correct_option}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Quiz Taking View
//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-6xl mx-auto px-4">
//         {/* Quiz Header */}
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
//           <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
//             <div className="flex items-center gap-3">
//               <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
//                 <BookOpen className="w-6 h-6 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold text-gray-800">{video.quiz.title}</h1>
//                 <p className="text-gray-600">Video: {video.title}</p>
//               </div>
//             </div>
//             <button
//               onClick={handleBackToVideos}
//               className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200"
//             >
//               <ArrowLeft size={18} />
//               Back to Videos
//             </button>
//           </div>
//           <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
//             <span className="flex items-center gap-1">
//               <Flag className="w-4 h-4 text-gray-500" />
//               Questions: {questions.length}
//             </span>
//             <span className="flex items-center gap-1">
//               <Check className="w-4 h-4 text-green-500" />
//               Answered: {answeredCount}/{questions.length}
//             </span>
//           </div>
//           {/* Progress Bar */}
//           <div className="w-full bg-gray-200 rounded-full h-2.5">
//             <div
//               className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
//               style={{ width: `${progress}%` }}
//             ></div>
//           </div>
//         </div>

//         {/* Quiz Content */}
//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//           {/* Question Panel */}
//           <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="mb-6">
//               <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
//                 <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
//                   Question {currentQuestionIndex + 1} of {questions.length}
//                 </span>
//               </div>
//               <h2 className="text-xl font-semibold text-gray-800 mb-6">
//                 {currentQuestion?.question_text}
//               </h2>
//             </div>
//             {/* Options */}
//             <div className="space-y-4 mb-8">
//               {['A', 'B', 'C', 'D'].map(option => (
//                 <label
//                   key={option}
//                   className={`flex items-start p-4 border rounded-xl cursor-pointer transition duration-200 ${
//                     quizAnswers[currentQuestion?.question_id] === option
//                       ? 'border-blue-500 bg-blue-50'
//                       : 'border-gray-200 hover:bg-gray-50'
//                   }`}
//                 >
//                   <input
//                     type="radio"
//                     name={`question_${currentQuestion?.question_id}`}
//                     value={option}
//                     checked={quizAnswers[currentQuestion?.question_id] === option}
//                     onChange={() => handleAnswerChange(currentQuestion?.question_id, option)}
//                     className="mt-1 mr-4 h-5 w-5 text-blue-600"
//                   />
//                   <div>
//                     <span className="font-medium text-gray-800">{option})</span>
//                     <span className="ml-2 text-gray-700">{currentQuestion?.[`option_${option.toLowerCase()}`]}</span>
//                   </div>
//                 </label>
//               ))}
//             </div>
//             {/* Navigation Buttons */}
//             <div className="flex justify-between">
//               <button
//                 onClick={handlePreviousQuestion}
//                 disabled={currentQuestionIndex === 0}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
//               >
//                 <ChevronLeft size={18} />
//                 Previous
//               </button>
//               <div className="space-x-3">
//                 {currentQuestionIndex === questions.length - 1 ? (
//                   <button
//                     onClick={handleSubmitQuiz}
//                     className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200"
//                   >
//                     <Save size={18} />
//                     Submit Quiz
//                   </button>
//                 ) : (
//                   <button
//                     onClick={handleNextQuestion}
//                     className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-200"
//                   >
//                     Next
//                     <ChevronRight size={18} />
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Question Navigator */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
//               <Flag className="w-5 h-5 text-blue-500" />
//               Questions
//             </h3>
//             <div className="grid grid-cols-5 gap-3">
//               {questions.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => handleGoToQuestion(index)}
//                   className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition duration-200 ${
//                     index === currentQuestionIndex
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
//                       : quizAnswers[questions[index]?.question_id]
//                       ? 'bg-green-100 text-green-800 hover:bg-green-200'
//                       : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                   }`}
//                 >
//                   {index + 1}
//                 </button>
//               ))}
//             </div>
//             <div className="mt-6 space-y-3 text-sm text-gray-600">
//               <div className="flex items-center">
//                 <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded mr-2"></div>
//                 Current question
//               </div>
//               <div className="flex items-center">
//                 <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
//                 Answered
//               </div>
//               <div className="flex items-center">
//                 <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
//                 Not answered
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default QuizPage;