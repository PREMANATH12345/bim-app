import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, BookOpen, ArrowRight } from "lucide-react";
import axios from "axios";

const Login = () => {
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_URL;

  const passwordRef = useRef(null);
  const usernameRef = useRef(null);

  const generateDeviceId = () => {
    return (
      "dev-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const saveToIndexedDB = (dbName, storeName, key, value) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.put({ id: key, value });
    };
    request.onerror = (event) => {
      console.error("IndexedDB Error:", event.target.error);
    };
  };

  const getFromIndexedDB = (dbName, storeName, key) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          return resolve(null);
        }
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);
        getRequest.onsuccess = () => {
          resolve(getRequest.result ? getRequest.result.value : null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  };

  const getDeviceId = async () => {
    let storedDeviceId = localStorage.getItem("device_id");

    if (!storedDeviceId) {
      storedDeviceId = await getFromIndexedDB(
        "device_id_db",
        "device_store",
        "device_id"
      );
    }

    if (!storedDeviceId) {
      storedDeviceId = generateDeviceId();
      localStorage.setItem("device_id", storedDeviceId);
      saveToIndexedDB(
        "device_id_db",
        "device_store",
        "device_id",
        storedDeviceId
      );
    }

    setDeviceId(storedDeviceId);
    return storedDeviceId;
  };

  useEffect(() => {
    getDeviceId();
    usernameRef.current?.focus(); // Autofocus username input on mount
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const device_id = await getDeviceId();

    try {
      const res = await axios.post(`${API_URL}/login`, {
        user_name,
        password,
        device_id,
      });

      localStorage.setItem("token", res.data.token);

      if (res.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-40 left-40 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-300">
              <img src="/logo.png" className="w-full h-full text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              BIM 
            </h1>
            <p className="text-blue-200 text-sm">
              Transform your learning journey
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 transition-colors group-focus-within:text-blue-400" />
                <input
                  ref={usernameRef}
                  type="text"
                  placeholder="Enter your username"
                  value={user_name}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 transition-colors group-focus-within:text-blue-400" />
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogin(e);
                    }
                  }}
                  className="w-full pl-11 pr-12 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] group"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </button>
          </div>

          {/* Additional Options */}
      
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Secure • Reliable • Innovative
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
