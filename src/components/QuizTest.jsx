import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Check, 
  X, 
  Save 
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Loading from '../components/Loading';

const QuizTest = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const API_URL = import.meta.env.VITE_URL;

  useEffect(() => {
    fetchQuizAndQuestions();
  }, [quizId]);

  const fetchQuizAndQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch quiz details
      const quizResponse = await axios.get(`${API_URL}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuiz(quizResponse.data);

      // Fetch questions
      const questionsResponse = await axios.get(`${API_URL}/quizzes/${quizId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let allQuestions = questionsResponse.data;

      // Apply display logic
      if (quizResponse.data.display_mode === 'random') {
        allQuestions = shuffleArray([...allQuestions]);
      }

      const displayQuestions = allQuestions.slice(0, quizResponse.data.visible_questions);
      setQuestions(displayQuestions);

    } catch (error) {
      console.error('Error fetching quiz data:', error);
      toast.error('Failed to load quiz');
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleAnswerChange = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = () => {
    const ConfirmToast = ({ closeToast }) => (
      <div>
        <p className="font-medium">Are you sure you want to submit the quiz?</p>
        <p className="text-sm mb-4">You cannot change your answers after submission.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              calculateScore();
              setSubmitted(true);
              setShowResults(true);
              closeToast();
            }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
          >
            Submit
          </button>
          <button
            onClick={closeToast}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );

    toast(<ConfirmToast />, {
      position: "top-center",
      autoClose: false,
      closeButton: false,
      closeOnClick: false,
      draggable: false,
      className: "w-full max-w-md"
    });
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    questions.forEach(question => {
      if (answers[question.question_id] === question.correct_option) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    toast.success(`Quiz submitted! Your score: ${correctAnswers}/${questions.length}`, {
      position: "top-center",
      autoClose: 5000,
    });
  };

  const handleBackToQuizList = () => {
    navigate('/quizzes');
  };

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  if (loading || !quiz) {
    return <Loading />;
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">No Questions Available</h1>
              <p className="text-gray-600 mb-6">This quiz doesn't have any questions yet.</p>
              <button
                onClick={handleBackToQuizList}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium mx-auto"
              >
                <ChevronLeft size={18} />
                Back to Quiz List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <ToastContainer
            position="top-center"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={false}
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <div className="max-w-6xl mx-auto">
            {/* Quiz Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
                </div>
                <button
                  onClick={handleBackToQuizList}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  <ChevronLeft size={18} />
                  Back to Quiz List
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  <Flag className="w-4 h-4 text-gray-500" />
                  Questions: {questions.length}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  Answered: {answeredCount}/{questions.length}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {showResults ? (
              /* Results View */
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Quiz Results</h2>
                  <div className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-6">
                    <div className="text-6xl font-bold mb-2">
                      <span className="text-blue-600">{score}</span>
                      <span className="text-gray-400">/{questions.length}</span>
                    </div>
                    <div className="text-xl text-gray-700">
                      Score: {((score / questions.length) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                {/* Question Review */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Question Review
                  </h3>
                  {questions.map((question, index) => {
                    const userAnswer = answers[question.question_id];
                    const isCorrect = userAnswer === question.correct_option;
                    return (
                      <div 
                        key={question.question_id} 
                        className={`border rounded-xl p-5 transition-all duration-200 ${
                          isCorrect 
                            ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                            : 'border-red-300 bg-red-50 hover:bg-red-100'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                          <h4 className="font-medium text-gray-800">
                            <span className="font-bold">Q{index + 1}:</span> {question.question_text}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isCorrect 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {Object.entries(question.options || {}).map(([optionKey, optionText]) => (
                            <div 
                              key={optionKey} 
                              className={`p-3 rounded-lg border transition-all duration-200 ${
                                optionKey === question.correct_option 
                                  ? 'bg-green-100 border-green-400' 
                                  : optionKey === userAnswer && optionKey !== question.correct_option 
                                    ? 'bg-red-100 border-red-400' 
                                    : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-3 ${
                                  optionKey === question.correct_option 
                                    ? 'bg-green-500 text-white' 
                                    : optionKey === userAnswer && optionKey !== question.correct_option 
                                      ? 'bg-red-500 text-white' 
                                      : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {optionKey}
                                </span>
                                <span>{optionText}</span>
                                {optionKey === question.correct_option && (
                                  <Check className="ml-auto w-5 h-5 text-green-500" />
                                )}
                                {optionKey === userAnswer && optionKey !== question.correct_option && (
                                  <X className="ml-auto w-5 h-5 text-red-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 space-y-2">
                          <div>
                            <span className="font-medium">Your Answer: </span>
                            {userAnswer ? (
                              <span className={`px-2 py-1 rounded ${
                                isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                Option {userAnswer} - {question.options[userAnswer] || 'N/A'}
                              </span>
                            ) : (
                              <span className="text-gray-500">Not answered</span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">Correct Answer: </span>
                            <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                              Option {question.correct_option} - {question.options[question.correct_option] || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleBackToQuizList}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    <ChevronLeft size={18} />
                    Back to Quiz List
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz Taking View */
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Question Panel */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">
                      {currentQuestion.question_text}
                    </h2>
                  </div>
                  {/* Options */}
                  <div className="space-y-4 mb-8">
                    {Object.entries(currentQuestion.options || {}).map(([optionKey, optionText]) => (
                      <label 
                        key={optionKey} 
                        className={`flex items-start p-4 border rounded-xl cursor-pointer transition duration-200 ${
                          answers[currentQuestion.question_id] === optionKey
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question_${currentQuestion.question_id}`}
                          value={optionKey}
                          checked={answers[currentQuestion.question_id] === optionKey}
                          onChange={() => handleAnswerChange(currentQuestion.question_id, optionKey)}
                          className="mt-1 mr-4 h-5 w-5 text-blue-600"
                        />
                        <div>
                          <span className="font-medium text-gray-800">{optionKey})</span>
                          <span className="ml-2 text-gray-700">{optionText}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {/* Navigation Buttons */}
                  <div className="flex justify-between">
                    <button
                      onClick={handlePrevious}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>
                    <div className="space-x-3">
                      {currentQuestionIndex === questions.length - 1 ? (
                        <button
                          onClick={handleSubmitQuiz}
                          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200"
                        >
                          <Save size={18} />
                          Submit Quiz
                        </button>
                      ) : (
                        <button
                          onClick={handleNext}
                          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-200"
                        >
                          Next
                          <ChevronRight size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Question Navigator */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Flag className="w-5 h-5 text-blue-500" />
                    Questions
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleGoToQuestion(index)}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition duration-200 ${
                          index === currentQuestionIndex
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                            : answers[questions[index].question_id]
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTest;  