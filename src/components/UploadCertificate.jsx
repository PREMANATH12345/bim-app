import React, { useState } from "react";
import {
  Award,
  Upload,
  User,
  BookOpen,
  Calendar,
  Clock,
  Percent,
  UserCheck,
  Image,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";
import toast from "react-hot-toast";

const UploadCertificate = () => {
  const [formData, setFormData] = useState({
    certificate_id: "",
    student_id: "",
    student_name: "",
    course_name: "",
    course_hours: "",
    enrollment_date: "",
    issue_date: "",
    assignment_percentage: "",
    attendance_percentage: "",
    trained_by: "",
    certificate_image: null,
  });

  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_URL;

  const handleChange = (e) => {
    if (e.target.name === "certificate_image") {
      setFormData({
        ...formData,
        certificate_image: e.target.files?.[0] || null,
      });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      if (value !== null) {
        formDataToSend.append(key, value);
      }
    });

    try {
      const res = await fetch(`${API_URL}/certificates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload certificate.");
      }

      toast.success("Certificate uploaded successfully!");

      // Reset form
      setFormData({
        certificate_id: "",
        student_id: "",
        student_name: "",
        course_name: "",
        course_hours: "",
        enrollment_date: "",
        issue_date: "",
        assignment_percentage: "",
        attendance_percentage: "",
        trained_by: "",
        certificate_image: null,
      });
    } catch (error) {
      toast.error("Error uploading certificate: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {loading && <Loading />}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Upload Certificate
              </h1>
            </div>
            <p className="text-gray-600">
              Create and upload student certificates
            </p>
          </div>

          {/* Upload Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8 max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Certificate ID */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Award className="w-4 h-4" />
                    Certificate ID
                  </label>
                  <input
                    type="text"
                    name="certificate_id"
                    value={formData.certificate_id}
                    onChange={handleChange}
                    placeholder="Enter certificate ID"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Student ID */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Student ID
                  </label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    placeholder="Enter student ID"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Student Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Student Name
                  </label>
                  <input
                    type="text"
                    name="student_name"
                    value={formData.student_name}
                    onChange={handleChange}
                    placeholder="Enter student name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Course Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4" />
                    Course Name
                  </label>
                  <input
                    type="text"
                    name="course_name"
                    value={formData.course_name}
                    onChange={handleChange}
                    placeholder="Enter course name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Course Hours */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4" />
                    Course Hours
                  </label>
                  <input
                    type="number"
                    name="course_hours"
                    value={formData.course_hours}
                    onChange={handleChange}
                    placeholder="Enter course hours"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Enrollment Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Enrollment Date
                  </label>
                  <input
                    type="date"
                    name="enrollment_date"
                    value={formData.enrollment_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Issue Date
                  </label>
                  <input
                    type="date"
                    name="issue_date"
                    value={formData.issue_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Attendance Percentage */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Percent className="w-4 h-4" />
                    Attendance %
                  </label>
                  <input
                    type="number"
                    max={100}
                    name="attendance_percentage"
                    value={formData.attendance_percentage}
                    onChange={handleChange}
                    placeholder="Enter attendance percentage"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Assignment Percentage */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Percent className="w-4 h-4" />
                    Assignment %
                  </label>
                  <input
                    type="number"
                    max={100}
                    name="assignment_percentage"
                    value={formData.assignment_percentage}
                    onChange={handleChange}
                    placeholder="Enter assignment percentage"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {/* Trained By */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <UserCheck className="w-4 h-4" />
                    Trained By
                  </label>
                  <input
                    type="text"
                    name="trained_by"
                    value={formData.trained_by}
                    onChange={handleChange}
                    placeholder="Enter trainer name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Certificate Image */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Image className="w-4 h-4" />
                  Certificate Image
                </label>
                <input
                  type="file"
                  name="certificate_image"
                  accept="image/*"
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-yellow-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Certificate
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadCertificate;
