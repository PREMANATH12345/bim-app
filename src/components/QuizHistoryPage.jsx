import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, BookOpen, Check, X, ChevronLeft, Calendar, Clock } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { jwtDecode } from "jwt-decode";


const QuizHistoryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videoId = location.state?.videoId;
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_URL || 'http://localhost:3001/api';
  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState("");

   // Decode token and set role 
  useEffect(() => {
    if (token) {  
      try {
        const decoded = jwtDecode(token);
        setUserInfo({
          name: decoded.name,
          role: decoded.role,
          id: decoded.id,
        });
        setRole(decoded.role);
      } catch (err) {
        console.error("Invalid token:", err);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [token, navigate]);


  useEffect(() => {
    if (!videoId) {
      navigate(role === "admin" ? "/admin" : "/student");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch video details
        const videoRes = await fetch(`${API_URL}/videos/videoShow/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!videoRes.ok) {
          throw new Error(`Failed to fetch video: ${videoRes.status}`);
        } 
        
        const videoData = await videoRes.json();
        setVideo(videoData.video);

        // 2. Fetch quiz attempts
        const attemptsRes = await fetch(`${API_URL}/videos/quiz-history?videoId=${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!attemptsRes.ok) {
          throw new Error(`Failed to fetch attempts: ${attemptsRes.status}`);
        }

        const attemptsData = await attemptsRes.json();

        // MODIFIED: Simplified attempt processing - trust backend calculations
        const processedAttempts = (attemptsData.attempts || []).map(attempt => {
          // MODIFIED: Get passing threshold from quiz data (from database)
          const quiz = videoData.video.quiz;
          const passingThreshold = quiz?.passing_percentage || quiz?.pass_percentage || 60;
          
          // MODIFIED: Use percentage from backend to determine pass/fail status
          const percentage = attempt.percentage ? parseFloat(attempt.percentage) : 0;
          const isPassed = percentage >= passingThreshold;
          
          return {
            id: attempt.attempt_id,
            attempt_id: attempt.attempt_id,
            video_id: attempt.video_id,
            quiz_id: attempt.quiz_id,
            score: attempt.score || 0,
            // MODIFIED: Use visible_questions from backend, fallback to score count
            // totalQuestions: attempt.visible_questions || attempt.score || 0,
            totalQuestions: attempt.visible_questions || attempt.total_questions || 0,
            percentage: percentage.toFixed(2),
            // MODIFIED: Calculate status based on backend percentage and threshold
            status: isPassed ? 'passed' : 'failed',
            timestamp: attempt.completed_at || attempt.started_at || new Date().toISOString(),
            video_title: attempt.video_title,
            quiz_title: attempt.quiz_title,
            passingThreshold: passingThreshold
          };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setQuizAttempts(processedAttempts);
        
        // Store in localStorage as fallback
        localStorage.setItem(`quizAttempts_${videoId}`, JSON.stringify(processedAttempts));

      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        
        // Fallback to localStorage if available
        const localAttempts = JSON.parse(localStorage.getItem(`quizAttempts_${videoId}`) || '[]');
        setQuizAttempts(localAttempts);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [videoId, token, navigate, API_URL, role]);

  const handleViewAttempt = async (attempt) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/videos/quiz-attempt-details/${attempt.attempt_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch attempt details: ${res.status}`);
      }

      const data = await res.json();
      
      // Transform the response to match expected structure
      const detailedAttempt = {
        ...attempt,
        questions: (data.questions || data.details || []).map(q => ({
          question_id: q.question_id || q.id,
          question_text: q.question_text || q.text || 'Question text not available',
          options: q.options || q.choices || {
            A: "Option A",
            B: "Option B", 
            C: "Option C",
            D: "Option D"
          },
          correct_option: q.correct_option || q.correct_answer || 'A'
        })),
        answers: data.answers || (data.details || []).reduce((acc, detail) => {
          acc[detail.question_id || detail.id] = detail.selected_option || detail.answer;
          return acc;
        }, {})
      };

      // MODIFIED: Keep the totalQuestions from the attempt (which should be visible_questions)
      // Don't override with questions.length as that might be different
      detailedAttempt.totalQuestions = attempt.totalQuestions;

      setSelectedAttempt(detailedAttempt);
    } catch (err) {
      console.error('Error loading attempt details:', err);
      setError(err.message);
      // Fallback to basic attempt data
      setSelectedAttempt(attempt);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHistory = () => {
    setSelectedAttempt(null);
  };

  const handleBackToVideo = () => {
    navigate('/video', { state: { videoId: videoId } });
  };

  const handleRetakeQuiz = () => {
    navigate('/quiz', { state: { videoId: videoId } });
  };

  // MODIFIED: Simplified helper function to determine if attempt passed
  const isAttemptPassed = (attempt) => {
    // Use the status calculated during data processing
    return attempt.status === 'passed';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role={role}/>
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading quiz history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role={role}/>
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedAttempt) {
    const attemptPassed = isAttemptPassed(selectedAttempt);
    
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <div className="flex-shrink-0 z-10">
            <TopBar />
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="py-4 sm:py-6 w-full">
              <div className="w-full mx-auto max-w-screen-2xl">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Quiz Results</h2>
                    <div className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 sm:p-8 mb-4 sm:mb-6">
                      <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                        <span className="text-blue-600">{selectedAttempt.score}</span>
                        {/* <span className="text-gray-400">/{selectedAttempt.totalQuestions}</span> */}
                         <span className="text-gray-400">/{selectedAttempt.questions.length}</span>
                      </div>
                      <div className="text-lg sm:text-xl text-gray-700">
                        Score: {selectedAttempt.percentage}%
                      </div>
                      <div className={`text-sm font-medium mt-2 ${
                        attemptPassed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {attemptPassed ? "Passed" : "Failed"}
                        {selectedAttempt.passingThreshold && (
                          <span className="text-xs text-gray-500 block mt-1">
                            (Passing: {selectedAttempt.passingThreshold}%)
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-2">
                        {new Date(selectedAttempt.timestamp).toLocaleDateString()} {new Date(selectedAttempt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {selectedAttempt.questions && selectedAttempt.questions.length > 0 ? (
                    <div className="space-y-6 sm:space-y-8">
                      <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        Question Review ({selectedAttempt.questions.length} questions)
                      </h3>
                      {selectedAttempt.questions.map((question, index) => {
                        const userAnswer = selectedAttempt.answers[question.question_id];
                        const isCorrect = userAnswer === question.correct_option;
                        return (
                          <div
                            key={`question-${question.question_id}-${index}`}
                            className={`border rounded-xl p-4 sm:p-6 transition-all duration-200 ${
                              isCorrect
                                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                : 'border-red-300 bg-red-50 hover:bg-red-100'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
                              <h4 className="font-medium text-gray-800 text-base sm:text-lg">
                                <span className="font-bold">Q{index + 1}:</span> {question.question_text}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                isCorrect
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 sm:mb-5">
                              {Object.entries(question.options).map(([option, text]) => (
                                <div
                                  key={`option-${question.question_id}-${option}`}
                                  className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 ${
                                    option === question.correct_option
                                      ? 'bg-green-100 border-green-400'
                                      : option === userAnswer && option !== question.correct_option
                                      ? 'bg-red-100 border-red-400'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-2 sm:mr-3 text-xs sm:text-sm ${
                                      option === question.correct_option
                                        ? 'bg-green-500 text-white'
                                        : option === userAnswer && option !== question.correct_option
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}>
                                      {option}
                                    </span>
                                    <span className="text-xs sm:text-sm flex-1">{text}</span>
                                    {option === question.correct_option && (
                                      <Check className="ml-2 w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                    )}
                                    {option === userAnswer && option !== question.correct_option && (
                                      <X className="ml-2 w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-gray-100 p-3 sm:p-4 rounded-lg">
                              <div className="text-xs sm:text-sm text-gray-700">
                                <span className="font-medium">Your Answer: </span>
                                {userAnswer ? (
                                  <span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md ${
                                    isCorrect ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'
                                  }`}>
                                    Option {userAnswer} - {question.options[userAnswer] || 'N/A'}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">Not answered</span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-700">
                                <span className="font-medium">Correct Answer: </span>
                                <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-md bg-green-200 text-green-900">
                                  Option {question.correct_option} - {question.options[question.correct_option] || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No question details available for this attempt
                    </div>
                  )}
                  
                  <div className="flex flex-wrap justify-center gap-4 mt-8 sm:mt-10">
                    <button
                      onClick={handleBackToHistory}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-6 sm:py-3 sm:px-8 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <ChevronLeft size={18} />
                      Back to History
                    </button>
                    <button
                      onClick={handleRetakeQuiz}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-6 sm:py-3 sm:px-8 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <BookOpen size={18} />
                      Retake Quiz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={role}/>
      <div className="flex-1 flex flex-col">
        <div className="flex-shrink-0 z-10">
          <TopBar />
        </div>
        <div className="flex-1 overflow-y-auto">
          <main className="p-4 sm:p-6 md:p-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quiz History</h1>
                    <p className="text-gray-600">{video?.title}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleBackToVideo}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    <ChevronLeft size={18} />
                    Back to Video
                  </button>
                  <button
                    onClick={handleRetakeQuiz}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    <BookOpen size={18} />
                    Retake Quiz
                  </button>
                </div>
              </div>

              {quizAttempts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-max mx-auto mb-4">
                    <BookOpen className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    No Quiz Attempts
                  </h3>
                  <p className="text-gray-600 mb-6">
                    You haven't completed this quiz yet.
                  </p>
                  <button
                    onClick={handleRetakeQuiz}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Take Quiz Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Your Attempts ({quizAttempts.length})
                  </h3>
                  <div className="space-y-3">
                    {quizAttempts.map((attempt, index) => {
                      const attemptPassed = isAttemptPassed(attempt);
                      return (
                        <div
                          key={`attempt-${attempt.attempt_id}-${index}`}
                          className="bg-gray-50 rounded-lg p-4 border hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handleViewAttempt(attempt)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-800 text-lg">
                                Attempt #{quizAttempts.length - index}
                              </span>
                              <div
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  attemptPassed
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {attemptPassed ? "Passed" : "Failed"}
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(attempt.timestamp).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-4 h-4" />
                                {new Date(attempt.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-3xl font-bold text-blue-600">
                                {attempt.score}/{attempt.totalQuestions}
                              </div>
                              <div className="text-xl text-gray-700">
                                {attempt.percentage}%
                              </div>
                            </div>
                            <div className="text-xs text-blue-600 hover:text-blue-800">
                              Click to view detailed results →
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default QuizHistoryPage;