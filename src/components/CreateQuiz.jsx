import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, BookOpen, ChevronRight, X, Save } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Loading from '../components/Loading';

const CreateQuiz = () => {
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_URL;

  const [formData, setFormData] = useState({
    title: '',
    total_questions: '',
    visible_questions: '',
    display_mode: 'ordered',
     quiz_for_website: false,      // Add this line
  website_quiz_type: ''         // Add this line
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Quiz title is required';
    }

    if (!formData.total_questions || formData.total_questions <= 0) {
      newErrors.total_questions = 'Total questions must be greater than 0';
    }

    if (!formData.visible_questions || formData.visible_questions <= 0) {
      newErrors.visible_questions = 'Visible questions must be greater than 0';
    }

    if (formData.visible_questions && formData.total_questions && 
        parseInt(formData.visible_questions) > parseInt(formData.total_questions)) {
      newErrors.visible_questions = 'Visible questions cannot be more than total questions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/quizzes`, {
        ...formData,
        total_questions: parseInt(formData.total_questions),
        visible_questions: parseInt(formData.visible_questions),
        quiz_for_website: formData.quiz_for_website ? formData.website_quiz_type : null  // Add this line
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Quiz created successfully!');
      navigate(`/quizzes/${response.data.quiz_id}/questions`);
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/quizzes');
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
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Create New Quiz</h1>
            </div>
            <p className="text-gray-600">Set up a new quiz with basic information</p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                  Quiz Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="JavaScript Basics"
                />
                {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="total_questions" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                    Total Number of Questions *
                  </label>
                  <input
                    type="number"
                    id="total_questions"
                    name="total_questions"
                    value={formData.total_questions}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.total_questions ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 50"
                  />
                  {errors.total_questions && <p className="mt-2 text-sm text-red-600">{errors.total_questions}</p>}
                </div>

                <div>
                  <label htmlFor="visible_questions" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                    Questions to Display to Students *
                  </label>
                  <input
                    type="number"
                    id="visible_questions"
                    name="visible_questions"
                    value={formData.visible_questions}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.visible_questions ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 30"
                  />
                  {errors.visible_questions && <p className="mt-2 text-sm text-red-600">{errors.visible_questions}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="display_mode" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                  Quiz Type *
                </label>
                <select
                  id="display_mode"
                  name="display_mode"
                  value={formData.display_mode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ordered">Ordered (Sequential)</option>
                  <option value="random">Random</option>
                </select>
              </div>


              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
                  <input
                    type="checkbox"
                    name="quiz_for_website"
                    checked={formData.quiz_for_website}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        quiz_for_website: e.target.checked,
                        website_quiz_type: e.target.checked ? prev.website_quiz_type : ''
                      }));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Set Quiz for Website
                </label>

                {formData.quiz_for_website && (
                  <div>
                    <label htmlFor="website_quiz_type" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                      Website Quiz Type *
                    </label>
                    <select
                      id="website_quiz_type"
                      name="website_quiz_type"
                      value={formData.website_quiz_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.quiz_for_website}
                    >
                      <option value="">Select quiz type</option>
                      <option value="free">Free Quiz</option>
                      {/* <option value="signup">Signup Quiz</option> */}
                      <option value="login">Login Quiz</option>
                      <option value="paid">Paid Quiz</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition duration-200 disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                  {loading ? 'Creating...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;