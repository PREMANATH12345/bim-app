import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Play, Trash2, HelpCircle, Search, Filter, ChevronLeft, ChevronRight, BookOpen, Eye, List } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Loading from '../components/Loading';

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [displayModeFilter, setDisplayModeFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [batches, setBatches] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [quizzesPerPage, setQuizzesPerPage] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  const API_URL = import.meta.env.VITE_URL;

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const quizzesWithCounts = await Promise.all(
        response.data.map(async (quiz) => {
          try {
            const questionsResponse = await axios.get(`${API_URL}/quizzes/${quiz.quiz_id}/questions`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return {
              ...quiz,
              questionCount: questionsResponse.data.length
            };
          } catch (error) {
            return {
              ...quiz,
              questionCount: 0
            };
          }
        })
      );

      setQuizzes(quizzesWithCounts);
      setFilteredQuizzes(quizzesWithCounts);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      alert('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...quizzes];

    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (quiz) => quiz.title && String(quiz.title).toLowerCase().includes(searchLower)
      );
    }

    if (displayModeFilter !== "all") {
      filtered = filtered.filter((quiz) => quiz.display_mode === displayModeFilter);
    }

    setFilteredQuizzes(filtered);
    setCurrentPage(1);
  }, [searchTerm, displayModeFilter, quizzes]);

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (window.confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Quiz deleted successfully');
        fetchQuizzes();
      } catch (error) {
        console.error('Error deleting quiz:', error);
        alert('Failed to delete quiz');
      }
    }
  };

  const handleCreateQuiz = () => {
    navigate('/quizzes/create');
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/quizzes/edit/${quizId}`);
  };

  const handleTestQuiz = (quizId) => {
    navigate(`/quiz/test/${quizId}`);
  };

  const handleAddQuestions = (quizId) => {
    navigate(`/quizzes/${quizId}/questions`);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDisplayModeFilter("all");
    setBatchFilter("all");
  };

  // Pagination logic
  const indexOfLastQuiz = currentPage * quizzesPerPage;
  const indexOfFirstQuiz = indexOfLastQuiz - quizzesPerPage;
  const currentQuizzes = filteredQuizzes.slice(indexOfFirstQuiz, indexOfLastQuiz);
  const totalPages = Math.ceil(filteredQuizzes.length / quizzesPerPage);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        endPage = 4;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      if (startPage > 2) {
        pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push("...");
      }

      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Quiz Management</h1>
            </div>
            <p className="text-gray-600">Manage quizzes and create new assessments</p>
          </div>

          {/* Filters Section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Display Mode Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Eye className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={displayModeFilter}
                onChange={(e) => setDisplayModeFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Display Modes</option>
                <option value="random">Random</option>
                <option value="ordered">Ordered</option>
              </select>
            </div>

            {/* Items Per Page Selector */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <List className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={quizzesPerPage}
                onChange={(e) => {
                  setQuizzesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    Show {size} items
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {/* Reset Filters Button */}
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              Reset Filters
            </button>

            {/* Create Quiz Button */}
            <button
              onClick={handleCreateQuiz}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium whitespace-nowrap"
            >
              <Plus size={18} />
              Create Quiz
            </button>
          </div>

          {currentQuizzes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No quizzes found</p>
              <p className="text-gray-600 mb-6">Get started by creating your first quiz</p>
              <button
                onClick={handleCreateQuiz}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium mx-auto"
              >
                <Plus size={18} />
                Create Your First Quiz
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Quiz Title
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Total Questions
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Visible Questions
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Display Mode
                        </th>
<th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
  Quiz for Website
</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentQuizzes.map((quiz) => (
                        <tr key={quiz.quiz_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {quiz.title.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{quiz.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {quiz.total_questions}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {quiz.visible_questions || quiz.display_questions || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              quiz.display_mode === 'random'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {quiz.display_mode}
                            </span>
                          </td>
<td className="px-6 py-4">
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    quiz.quiz_for_website
      ? 'bg-blue-100 text-blue-800'
      : 'bg-gray-100 text-gray-800'
  }`}>
    {quiz.quiz_for_website || 'No quiz for website'}
  </span>
</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddQuestions(quiz.quiz_id)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Add Questions"
                              >
                                <HelpCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleEditQuiz(quiz.quiz_id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleTestQuiz(quiz.quiz_id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Test"
                              >
                                <Play size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.quiz_id, quiz.title)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 mb-8">
                {currentQuizzes.map((quiz) => (
                  <div key={quiz.quiz_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {quiz.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Total: {quiz.total_questions}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Display: {quiz.visible_questions || quiz.display_questions || 0}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        quiz.display_mode === 'random'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.display_mode}
                      </span>
                    </div>

<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  quiz.quiz_for_website
    ? 'bg-blue-100 text-blue-800'
    : 'bg-gray-100 text-gray-800'
}`}>
  Website: {quiz.quiz_for_website || 'None'}
</span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => handleAddQuestions(quiz.quiz_id)}
                        className="flex items-center justify-center gap-1 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded text-sm transition duration-200"
                      >
                        <HelpCircle size={16} />
                        <span className="hidden sm:inline">Add Questions</span>
                        <span className="sm:hidden">Add Q</span>
                      </button>
                      <button
                        onClick={() => handleEditQuiz(quiz.quiz_id)}
                        className="flex items-center justify-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded text-sm transition duration-200"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleTestQuiz(quiz.quiz_id)}
                        className="flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 px-3 py-2 rounded text-sm transition duration-200"
                      >
                        <Play size={16} />
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.quiz_id, quiz.title)}
                        className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded text-sm transition duration-200"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filteredQuizzes.length > quizzesPerPage && (
                <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">{indexOfFirstQuiz + 1}</span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastQuiz, filteredQuizzes.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">{filteredQuizzes.length}</span>{" "}
                    quizzes
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {getPageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          typeof page === "number" ? setCurrentPage(page) : null
                        }
                        disabled={page === "..."}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg border ${
                          currentPage === page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizList;