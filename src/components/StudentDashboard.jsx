import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Clock, Award } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const StudentDashboard = () => {
  const [videos, setVideos] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_URL;

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/videos/videos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (response.ok) {
          setVideos(data.videos);
        } else {
          console.error("Error fetching videos:", data.error);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    fetchVideos();
  }, [token]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="student" />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 rounded-2xl p-6 lg:p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">Welcome to Your Learning Journey</h1>
                  <p className="text-blue-100 mt-1">Continue your progress and master new skills</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Play className="w-6 h-6 text-blue-200" />
                    <div>
                      <p className="text-sm text-blue-200">Available Videos</p>
                      <p className="text-xl font-bold">{videos.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-purple-200" />
                    <div>
                      <p className="text-sm text-purple-200">Hours Learned</p>
                      <p className="text-xl font-bold">24</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-teal-200" />
                    <div>
                      <p className="text-sm text-teal-200">Certificates</p>
                      <p className="text-xl font-bold">2</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Content */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Course Videos</h2>
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <div 
                    key={video.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                      <img
                        src="https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800"
                        alt="Video Thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 rounded-full p-3">
                          <Play className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {video.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>45 mins</span>
                        </div>
                        <button
                          onClick={() =>
                            navigate("/video", { state: { videoId: video.id } })
                          }
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
                        >
                          Watch Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Videos Available</h3>
                <p className="text-gray-600">No videos are currently available for your batch. Check back later!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;