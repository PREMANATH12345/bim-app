import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, ChevronLeft, Trash2, Check } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Loading from '../components/Loading';

const AddQuestions = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [numOptions, setNumOptions] = useState("");
  const [correctOption, setCorrectOption] = useState("");

  const API_URL = import.meta.env.VITE_URL;

  const [formData, setFormData] = useState({
    question_text: '',
    options: {
      '1': '',
      '2': ''
    }
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchQuizData();
    fetchQuestions();
  }, [quizId]);

  useEffect(() => {
    // Update formData.options when numOptions changes
    if (numOptions) {
      const newOptions = {};
      for (let i = 1; i <= parseInt(numOptions); i++) {
        newOptions[i.toString()] = formData.options[i.toString()] || '';
      }
      setFormData(prev => ({
        ...prev,
        options: newOptions
      }));

      // Ensure correct option is within bounds
      if (parseInt(correctOption) > parseInt(numOptions)) {
        setCorrectOption(numOptions);
      }
    }
  }, [numOptions]);

  const fetchQuizData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuiz(response.data);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Failed to fetch quiz data');
      navigate('/quizzes');
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/quizzes/${quizId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleOptionChange = (optionKey, value) => {
    setFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [optionKey]: value
      }
    }));

    if (errors[`option_${optionKey}`]) {
      setErrors(prev => ({
        ...prev,
        [`option_${optionKey}`]: ''
      }));
    }
  };

  const handleNumOptionsChange = (e) => {
    const value = e.target.value;
    // Allow empty or positive numbers up to 10
    if (value === '' || (!isNaN(value) && parseInt(value) > 0 && parseInt(value) <= 10)) {
      setNumOptions(value);
    }
  };

  const handleCorrectOptionChange = (e) => {
    const value = e.target.value;
    // Allow empty or positive numbers within option range
    if (value === '' || (!isNaN(value) && parseInt(value) > 0 && (!numOptions || parseInt(value) <= parseInt(numOptions)))) {
      setCorrectOption(value);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.question_text.trim()) {
      newErrors.question_text = 'Question text is required';
    }

    // Validate all options that should exist based on numOptions
    for (let i = 1; i <= parseInt(numOptions || 0); i++) {
      const optionKey = i.toString();
      if (!formData.options[optionKey] || !formData.options[optionKey].trim()) {
        newErrors[`option_${optionKey}`] = `Option ${optionKey} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert inputs to numbers
    const optionsCount = parseInt(numOptions) || 0;
    const correctOpt = parseInt(correctOption) || 0;

    // Validation checks
    if (optionsCount < 2) {
      alert("Please enter at least 2 options");
      return;
    }

    if (optionsCount > 10) {
      alert("Maximum 10 options allowed");
      return;
    }

    if (correctOpt < 1 || correctOpt > optionsCount) {
      alert(`Please enter a correct option between 1 and ${optionsCount}`);
      return;
    }

    if (!validateForm()) {
      alert("Please fill all required fields");
      return;
    }

    if (questions.length >= quiz.total_questions) {
      alert(`You have already added ${quiz.total_questions} questions (the maximum for this quiz).`);
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      // Prepare payload with only the needed options
      const submittedOptions = {};
      for (let i = 1; i <= optionsCount; i++) {
        submittedOptions[i.toString()] = formData.options[i.toString()] || '';
      }

      const payload = {
        question_text: formData.question_text,
        options: submittedOptions,
        correct_option: correctOpt.toString() // Store as string number
      };


      await axios.post(`${API_URL}/quizzes/${quizId}/questions`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form
      setFormData({
        question_text: '',
        options: { '1': '', '2': '' }
      });
      setNumOptions('');
      setCorrectOption('');
      setErrors({});

      fetchQuestions();
      alert('Question added successfully!');
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/questions/${questionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Question deleted successfully');
        fetchQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question');
      }
    }
  };

  const handleFinish = () => {
    navigate('/quizzes');
  };

  if (loading || !quiz) {
    return <Loading />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6">
          <div className="container mx-auto max-w-full">
            {/* Quiz Info Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 break-words">{quiz.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <span className="bg-blue-50 px-2 py-1 rounded"><strong>Total Questions:</strong> {quiz.total_questions}</span>
                <span className="bg-green-50 px-2 py-1 rounded"><strong>Display Questions:</strong> {quiz.visible_questions}</span>
                <span className="bg-yellow-50 px-2 py-1 rounded"><strong>Mode:</strong> {quiz.display_mode}</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800">
                  Questions Added: {questions.length} / {quiz.total_questions}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Add Question Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Add New Question</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="question_text" className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      id="question_text"
                      name="question_text"
                      value={formData.question_text}
                      onChange={handleInputChange}
                      rows="3"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        errors.question_text ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your question here"
                    />
                    {errors.question_text && <p className="mt-1 text-sm text-red-600">{errors.question_text}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="num_options" className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Options *
                      </label>
                      <input
                        type="number"
                        id="num_options"
                        name="num_options"
                        min="2"
                        max="10"
                        value={numOptions}
                        onChange={handleNumOptionsChange}
                        placeholder="Enter number of options"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="correct_option" className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Option Number *
                      </label>
                      <input
                        type="number"
                        id="correct_option"
                        name="correct_option"
                        min="1"
                        max={numOptions || 1}
                        value={correctOption}
                        onChange={handleCorrectOptionChange}
                        placeholder="Enter correct option number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Dynamic Option Inputs */}
                  {numOptions && parseInt(numOptions) > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Options:</h3>
                      {Array.from({ length: parseInt(numOptions) }, (_, i) => {
                        const optionKey = (i + 1).toString();
                        return (
                          <div key={optionKey}>
                            <label htmlFor={`option_${optionKey}`} className="block text-sm font-medium text-gray-700 mb-1">
                              Option {optionKey} *
                              {parseInt(correctOption) === i + 1 && (
                                <span className="ml-2 text-green-600 text-xs">(Correct Answer)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              id={`option_${optionKey}`}
                              name={`option_${optionKey}`}
                              value={formData.options[optionKey] || ''}
                              onChange={(e) => handleOptionChange(optionKey, e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors[`option_${optionKey}`] ? 'border-red-500' : 
                                parseInt(correctOption) === i + 1 ? 'border-green-300 bg-green-50' : 'border-gray-300'
                              }`}
                              placeholder={`Enter option ${optionKey}`}
                              required
                            />
                            {errors[`option_${optionKey}`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`option_${optionKey}`]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-200 order-2 sm:order-1"
                    >
                      <ChevronLeft size={18} />
                      <span className="hidden sm:inline">Finish & Go Back</span>
                      <span className="sm:hidden">Finish</span>
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || questions.length >= quiz.total_questions || !numOptions || !correctOption}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                    >
                      {submitting ? 'Adding...' : 'Add Question'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Questions List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Added Questions ({questions.length})</h2>

                {questions.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No questions added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {questions.map((question, index) => {
                      // Ensure options is an object, handle both string and object cases
                      let options = {};
                      if (typeof question.options === 'string') {
                        try {
                          options = JSON.parse(question.options);
                        } catch (e) {
                          console.error('Error parsing options:', e);
                          options = {};
                        }
                      } else if (typeof question.options === 'object' && question.options !== null) {
                        options = question.options;
                      }

                      const correctOptionNum = question.correct_option?.toString();
                      
                      return (
                        <div key={question.question_id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition duration-200">
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                            <h3 className="font-medium text-gray-800 flex-1">
                              <span className="font-bold text-blue-600">Q{index + 1}:</span> {question.question_text}
                            </h3>
                            <button
                              onClick={() => handleDeleteQuestion(question.question_id)}
                              className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                          
                          {/* Options Display */}
                          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 mb-3">
                            {Object.entries(options).length > 0 ? (
                              Object.entries(options).map(([key, value]) => {
                                const isCorrect = correctOptionNum === key;
                                return (
                                  <div
                                    key={key}
                                    className={`p-3 rounded-lg border transition-colors ${
                                      isCorrect 
                                        ? 'bg-green-50 border-green-200 text-green-800' 
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="flex-1">
                                        <strong className="font-semibold">{key})</strong> {value}
                                      </span>
                                      {isCorrect && (
                                        <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                                          <Check className="w-4 h-4" />
                                          <span className="text-xs font-medium hidden sm:inline">Correct</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <span className="text-yellow-800 text-sm">No options available</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm bg-blue-50 rounded-lg p-2">
                            <span className="font-medium text-blue-800">
                              Correct Answer: Option {correctOptionNum || 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddQuestions;

