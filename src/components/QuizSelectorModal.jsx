import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, BookOpen, Eye } from 'lucide-react';
import axios from 'axios';

export const QuizSelectorModal = ({ 
  selectedQuizId, 
  onSelect, 
  isOpen, 
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef(null);
  const API_URL = import.meta.env.VITE_URL;

  // Fetch quizzes with question counts
  useEffect(() => {
    if (!isOpen) return;

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // First fetch all quizzes
        const response = await axios.get(`${API_URL}/quizzes`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Then fetch question counts for each quiz
        const quizzesWithCounts = await Promise.all(
          response.data.map(async (quiz) => {
            try {
              const questionsResponse = await axios.get(
                `${API_URL}/quizzes/${quiz.quiz_id}/questions`, 
                { headers: { Authorization: `Bearer ${token}` }}
              );
              
              return {
                ...quiz,
                questionCount: questionsResponse.data.length,
                // Ensure display_mode is properly set (fallback to 'ordered')
                display_mode: quiz.display_mode || 'ordered',
                // Calculate visible questions (fallback to total questions if not set)
                visible_questions: quiz.visible_questions || questionsResponse.data.length
              };
            } catch (error) {
              console.error(`Error fetching questions for quiz ${quiz.quiz_id}:`, error);
              return {
                ...quiz,
                questionCount: 0,
                display_mode: quiz.display_mode || 'ordered',
                visible_questions: quiz.visible_questions || 0
              };
            }
          })
        );

        setQuizzes(quizzesWithCounts);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        alert('Failed to fetch quizzes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [isOpen, API_URL]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quiz.course_name && quiz.course_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Select Quiz</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search quizzes..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Quiz Table */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading quizzes...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? "No matching quizzes found" : "No quizzes available"}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Quiz Title</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Total Questions</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Visible Questions</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Display Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredQuizzes.map((quiz) => (
                      <tr 
                        key={quiz.quiz_id}
                        onClick={() => onSelect(quiz.quiz_id)}
                        className={`cursor-pointer hover:bg-gray-50 ${selectedQuizId === quiz.quiz_id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {quiz.title.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{quiz.title}</span>
                              {quiz.course_name && (
                                <p className="text-sm text-gray-500">{quiz.course_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {quiz.questionCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {quiz.visible_questions || quiz.questionCount || 0}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2 p-2">
                {filteredQuizzes.map((quiz) => (
                  <div
                    key={quiz.quiz_id}
                    onClick={() => onSelect(quiz.quiz_id)}
                    className={`p-3 border rounded-lg cursor-pointer ${selectedQuizId === quiz.quiz_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {quiz.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{quiz.title}</span>
                        {quiz.course_name && (
                          <p className="text-sm text-gray-500">{quiz.course_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Total: {quiz.questionCount || 0}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Visible: {quiz.visible_questions || quiz.questionCount || 0}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        quiz.display_mode === 'random' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.display_mode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full md:w-auto bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};