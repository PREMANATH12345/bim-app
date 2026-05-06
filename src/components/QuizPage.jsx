import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Save, Flag, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { jwtDecode } from "jwt-decode";


const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videoId = location.state?.videoId;
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_URL;

  // States
  const [role, setRole] = useState("");
  const [video, setVideo] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [currentDisplayQuestions, setCurrentDisplayQuestions] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [passPercentage, setPassPercentage] = useState(60);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

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

  // Utility function
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch quiz attempt history
  const fetchQuizAttemptHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/videos/quiz-attempt-history?videoId=${videoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttemptHistory(data.attempts);
        setHasAttempted(data.attempts.length > 0);
      }
    } catch (error) {
      console.error("Error fetching quiz history:", error);
    }
  };

  // Start or continue quiz attempt
  const startQuizAttempt = async () => {
    try {
      const response = await fetch(`${API_URL}/videos/start-attempt/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      const data = await response.json();
      setAttemptId(data.attemptId);
      
      // If continuing existing attempt, load previous answers
      if (data.continueExisting) {
        const answersRes = await fetch(`${API_URL}/videos/quiz-attempt/${data.attemptId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (answersRes.ok) {
          const answersData = await answersRes.json();
          setQuizAnswers(answersData.answers);
          setCurrentQuestionIndex(answersData.currentQuestionIndex);
        }
      }
    } catch (err) {
      console.error("Error starting attempt:", err);
      toast.error("Failed to start quiz attempt");
    }
  };

  // Save answer progress
  const saveAnswerProgress = async (questionId, selectedOption) => {
    if (!attemptId) return;
    
    try {
      const isLastQuestion = currentQuestionIndex === currentDisplayQuestions.length - 1;
      
      await fetch(`${API_URL}/videos/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedOption,
          currentQuestionIndex,
          isLastQuestion
        })
      });
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  // Submit quiz attempt
  const submitQuizAttempt = async () => {
    try {
      // Calculate score based on visible questions
      const score = currentDisplayQuestions.reduce((total, question) => {
        const userAnswer = quizAnswers[question.question_id];
        return total + (userAnswer === question.correct_option ? 1 : 0);
      }, 0);

      const totalQuestions = currentDisplayQuestions.length;
      const percentage = ((score / totalQuestions) * 100).toFixed(1);

      const response = await fetch(`${API_URL}/videos/complete-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          attemptId,
          score,
          totalQuestions,
          percentage
        })
      });
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      setQuizScore(score);
      setShowQuizResults(true);
      setHasAttempted(true);
      fetchQuizAttemptHistory();

      toast.success(`Quiz submitted! Score: ${score}/${totalQuestions}`, {
        position: "top-center"
      });
    } catch (err) {
      console.error("Error submitting quiz:", err);
      toast.error("Failed to submit quiz");
    }
  };

  useEffect(() => {
    if (!videoId) {
      navigate(role === "admin" ? "/admin" : "/student");
      return;
    }

    const fetchVideoAndStartAttempt = async () => {
      try {
        // 1. Fetch video and quiz data
        const videoRes = await fetch(`${API_URL}/videos/videoShow/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!videoRes.ok) throw new Error(`Error: ${videoRes.status}`);
        
        const videoData = await videoRes.json();
        setVideo(videoData.video);
        setPassPercentage(videoData.video.quiz.pass_percentage || 60);

        // 2. Check for previous attempts
        await fetchQuizAttemptHistory();

        // Prepare questions
        const allQuestions = [...(videoData.video.quiz.questions || [])];
        let displayQuestions = allQuestions;

        if (videoData.video.quiz.display_mode === 'random') {
          displayQuestions = shuffleArray([...allQuestions]);
        }

        if (videoData.video.quiz.visible_questions) {
          displayQuestions = displayQuestions.slice(0, videoData.video.quiz.visible_questions);
        }

        setCurrentDisplayQuestions(displayQuestions);

        // 3. Start or continue attempt
        await startQuizAttempt();
        
      } catch (err) {
        console.error("Fetch error:", err);
        navigate(role === "admin" ? "/admin" : "/student");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndStartAttempt();
  }, [videoId, token, navigate, API_URL, role]);

  const handleAnswerChange = (questionId, selectedOption) => {
    const newAnswers = {
      ...quizAnswers,
      [questionId]: selectedOption
    };
    setQuizAnswers(newAnswers);
    saveAnswerProgress(questionId, selectedOption);
  };

  const handleNextQuestion = () => {
    if (quizAnswers[currentDisplayQuestions[currentQuestionIndex].question_id]) {
      if (currentQuestionIndex < currentDisplayQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } else {
      toast.warning("Please select an answer before proceeding");
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitQuiz = () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to submit the quiz?\nYou cannot change your answers after submission."
    );

    if (isConfirmed) {
      submitQuizAttempt();
    }
  };

  const handleBackToVideo = () => {
    navigate('/video', { state: { videoId } });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!video || !currentDisplayQuestions) {
    return <div className="flex justify-center items-center h-screen">Quiz data not available</div>;
  }

  const currentQuestion = currentDisplayQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / currentDisplayQuestions.length) * 100;
  const answeredCount = Object.keys(quizAnswers).length;
  const percentageScore = ((quizScore / currentDisplayQuestions.length) * 100).toFixed(1);
  const passedQuiz = percentageScore >= passPercentage;

  if (showQuizResults) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar role={role}/>
        <div className="flex-1 flex flex-col">
          <div className="z-10">
            <TopBar />
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
            <div className="min-h-full bg-gray-50 py-4 sm:py-6 w-full">
              <div className="w-full mx-auto max-w-screen-2xl">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 mx-auto">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Quiz Results</h2>
                    <div className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
                      <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                        <span className="text-blue-600">{quizScore}</span>
                        <span className="text-gray-400">/{currentDisplayQuestions.length}</span>
                      </div>
                      <div className="text-lg sm:text-xl text-gray-700">
                        Score: {percentageScore}% (Passing: {passPercentage}%)
                      </div>
                      <div className={`text-lg font-medium mt-2 ${
                        passedQuiz ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {passedQuiz ? "Congratulations! You passed!" : "You didn't pass. Try again!"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                      Question Review ({currentDisplayQuestions.length} questions)
                    </h3>
                    {currentDisplayQuestions.map((question, index) => {
                      const userAnswer = quizAnswers[question.question_id];
                      const isCorrect = userAnswer === question.correct_option;
                      return (
                        <div
                          key={question.question_id}
                          className={`border rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 ${
                            isCorrect
                              ? 'border-green-300 bg-green-50 hover:bg-green-100'
                              : 'border-red-300 bg-red-50 hover:bg-red-100'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <h4 className="font-medium text-gray-800 text-sm sm:text-base">
                              <span className="font-bold">Q{index + 1}:</span> {question.question_text}
                            </h4>
                            <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                              isCorrect
                                ? 'bg-green-200 text-green-800'
                                : 'bg-red-200 text-red-800'
                            }`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
                            {Object.entries(question.options || {}).map(([option, text]) => (
                              <div
                                key={option}
                                className={`p-2 sm:p-3 rounded-md sm:rounded-lg border transition-all duration-200 ${
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
                                  <span className="text-xs sm:text-sm flex-1 line-clamp-2">{text}</span>
                                  {option === question.correct_option && (
                                    <Check className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                  )}
                                  {option === userAnswer && option !== question.correct_option && (
                                    <X className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-gray-100 p-2 sm:p-3 rounded-md">
                            <div className="text-xs sm:text-sm text-gray-700">
                              <span className="font-medium">Your Answer: </span>
                              {userAnswer ? (
                                <span className={`px-2 py-0.5 sm:px-2 sm:py-1 rounded ${
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
                              <span className="px-2 py-0.5 sm:px-2 sm:py-1 rounded bg-green-200 text-green-900">
                                Option {question.correct_option} - {question.options[question.correct_option] || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 sm:mt-8">
                    <button
                      onClick={handleBackToVideo}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-5 sm:py-3 sm:px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
                      Back to Video
                    </button>
                    
                    <button
                      onClick={() => navigate('/quiz-history', { state: { videoId } })}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 px-5 sm:py-3 sm:px-6 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <BookOpen size={16} className="sm:w-5 sm:h-5" />
                      Quiz History
                    </button>

                    <button
                      onClick={() => window.location.reload()} // Refresh to start new attempt
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-5 sm:py-3 sm:px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <BookOpen size={16} className="sm:w-5 sm:h-5" />
                      Attend Another Quiz
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
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          <main className="p-4 sm:p-6 md:p-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">{video?.quiz?.title}</h1>
                </div>
                <button
                  onClick={handleBackToVideo}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  <ChevronLeft size={18} />
                  Back to Video
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  <Flag className="w-4 h-4 text-gray-500" />
                  Questions: {currentDisplayQuestions.length}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  Answered: {answeredCount}/{currentDisplayQuestions.length}
                </span>
                {hasAttempted && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Passing: {passPercentage}%
                  </span>
                )}
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Question {currentQuestionIndex + 1} of {currentDisplayQuestions.length}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">
                      {currentQuestion?.question_text}
                    </h2>
                  </div>

                  <div className="space-y-4 mb-8">
                    {Object.entries(currentQuestion.options || {}).map(([option, text]) => (
                      <label
                        key={option}
                        className={`flex items-start p-4 border rounded-xl cursor-pointer transition duration-200 ${
                          quizAnswers[currentQuestion.question_id] === option
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question_${currentQuestion.question_id}`}
                          value={option}
                          checked={quizAnswers[currentQuestion.question_id] === option}
                          onChange={() => handleAnswerChange(currentQuestion.question_id, option)}
                          className="mt-1 mr-4 h-5 w-5 text-blue-600"
                        />
                        <div>
                          <span className="font-medium text-gray-800">{option})</span>
                          <span className="ml-2 text-gray-700">{text}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>
                    <div className="space-x-3">
                      {currentQuestionIndex === currentDisplayQuestions.length - 1 ? (
                        <button
                          onClick={handleSubmitQuiz}
                          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200"
                        >
                          <Save size={18} />
                          Submit Quiz
                        </button>
                      ) : (
                        <button
                          onClick={handleNextQuestion}
                          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-200"
                        >
                          Next
                          <ChevronRight size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Flag className="w-5 h-5 text-blue-500" />
                    Questions
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: currentDisplayQuestions.length }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleGoToQuestion(index)}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition duration-200 ${
                          index === currentQuestionIndex
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                            : quizAnswers[currentDisplayQuestions[index].question_id]
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded mr-2"></div>
                      Current question
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
                      Answered
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
                      Not answered
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;



