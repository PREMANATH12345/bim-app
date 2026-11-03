// import { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { Eye, EyeOff, Lock, User, BookOpen, ArrowRight } from "lucide-react";
// import axios from "axios";

// const Login = () => {
//   const [user_name, setUserName] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [deviceId, setDeviceId] = useState(null);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();
//   const API_URL = import.meta.env.VITE_URL;
  

//   const passwordRef = useRef(null);
//   const usernameRef = useRef(null);

//   const generateDeviceId = () => {
//     return (
//       "dev-" +
//       Date.now().toString(36) +
//       "-" +
//       Math.random().toString(36).substring(2, 15)
//     );
//   };

//   const saveToIndexedDB = (dbName, storeName, key, value) => {
//     const request = indexedDB.open(dbName, 1);
//     request.onupgradeneeded = (event) => {
//       const db = event.target.result;
//       if (!db.objectStoreNames.contains(storeName)) {
//         db.createObjectStore(storeName, { keyPath: "id" });
//       }
//     };
//     request.onsuccess = (event) => {
//       const db = event.target.result;
//       const transaction = db.transaction(storeName, "readwrite");
//       const store = transaction.objectStore(storeName);
//       store.put({ id: key, value });
//     };
//     request.onerror = (event) => {
//       console.error("IndexedDB Error:", event.target.error);
//     };
//   };

//   const getFromIndexedDB = (dbName, storeName, key) => {
//     return new Promise((resolve, reject) => {
//       const request = indexedDB.open(dbName, 1);
//       request.onupgradeneeded = (event) => {
//         const db = event.target.result;
//         if (!db.objectStoreNames.contains(storeName)) {
//           db.createObjectStore(storeName, { keyPath: "id" });
//         }
//       };
//       request.onsuccess = (event) => {
//         const db = event.target.result;
//         if (!db.objectStoreNames.contains(storeName)) {
//           return resolve(null);
//         }
//         const transaction = db.transaction(storeName, "readonly");
//         const store = transaction.objectStore(storeName);
//         const getRequest = store.get(key);
//         getRequest.onsuccess = () => {
//           resolve(getRequest.result ? getRequest.result.value : null);
//         };
//         getRequest.onerror = () => reject(getRequest.error);
//       };
//       request.onerror = () => reject(request.error);
//     });
//   };

//   const getDeviceId = async () => {
//     let storedDeviceId = localStorage.getItem("device_id");

//     if (!storedDeviceId) {
//       storedDeviceId = await getFromIndexedDB(
//         "device_id_db",
//         "device_store",
//         "device_id"
//       );
//     }

//     if (!storedDeviceId) {
//       storedDeviceId = generateDeviceId();
//       localStorage.setItem("device_id", storedDeviceId);
//       saveToIndexedDB(
//         "device_id_db",
//         "device_store",
//         "device_id",
//         storedDeviceId
//       );
//     }

//     setDeviceId(storedDeviceId);
//     return storedDeviceId;
//   };

//   useEffect(() => {
//     getDeviceId();
//     usernameRef.current?.focus(); // Autofocus username input on mount
//   }, []);

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     const device_id = await getDeviceId();

//     try {
//       const res = await axios.post(`${API_URL}/login`, {
//         user_name,
//         password,
//         device_id,
//       });

//       localStorage.setItem("token", res.data.token);

//       if (res.data.role === "admin") {
//         navigate("/admin");
//       } else {
//         // Students should start in the course/video view after signing in.
//         sessionStorage.setItem("studentActiveTab", "courses");
//         navigate("/student");
//       }
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
//       {/* Animated Background Elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
//         <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
//         <div className="absolute top-40 left-40 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
//       </div>

//       <div className="relative z-10 w-full max-w-md">
//         {/* Main Card */}
//         <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
//           {/* Header */}
//           <div className="text-center mb-8">
//             <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-300">
//               <img src="/logo.png" className="w-full h-full text-white" />
//             </div>
//             <h1 className="text-3xl font-bold text-white mb-2">
//               BIM 
//             </h1>
//             <p className="text-blue-200 text-sm">
//               Transform your learning journey
//             </p>
//           </div>

//           {/* Form */}
//           <div className="space-y-6">
//             {error && (
//               <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
//                 {error}
//               </div>
//             )}

//             {/* Username Field */}
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-white/90">
//                 Username
//               </label>
//               <div className="relative group">
//               {/*  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 transition-colors group-focus-within:text-blue-400" /> */}
//                 <input
//                   ref={usernameRef}
//                   type="text"
//                   placeholder="Enter your username"
//                   value={user_name}
//                   onChange={(e) => setUserName(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                       e.preventDefault();
//                       passwordRef.current?.focus();
//                     }
//                   }}
//                   className="w-full pl-2 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
//                   required
//                 />
//               </div>
//             </div>

//             {/* Password Field */}
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-white/90">
//                 Password
//               </label>
//               <div className="relative group">
//               {/*  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 transition-colors group-focus-within:text-blue-400" />*/}
//                 <input
//                   ref={passwordRef}
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                       e.preventDefault();
//                       handleLogin(e);
//                     }
//                   }}
//                   className="w-full pl-2 pr-12 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
//                 >
//                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                 </button>
//               </div>
//             </div>

//             {/* Submit Button */}
//             <button
//               onClick={handleLogin}
//               className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] group"
//             >
//               {loading ? (
//                 <div className="flex items-center justify-center gap-3">
//                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
//                   <span>Signing In...</span>
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-center gap-2">
//                   <span>Sign In</span>
//                   <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
//                 </div>
//               )}
//             </button>
//           </div>

//           {/* Additional Options */}
      
//         </div>

//         {/* Footer */}
//         <div className="text-center mt-6">
//           <p className="text-white/60 text-sm">
//             Secure • Reliable • Innovative
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, Eye, EyeOff } from "lucide-react";
import axios from "axios";

let faceApiModulePromise;

const loadFaceApiModels = () => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("@vladmandic/face-api").then(async (faceapi) => {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return faceapi;
    }).catch((error) => {
      faceApiModulePromise = null;
      throw error;
    });
  }
  return faceApiModulePromise;
};

const Login = () => {
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState("password");
  const [faceMode, setFaceMode] = useState("every-time");
  const [loginMethodLoading, setLoginMethodLoading] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceStatus, setFaceStatus] = useState("");
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_URL;
  

  const passwordRef = useRef(null);
  const usernameRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const faceApiRef = useRef(null);

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

    if (storedDeviceId && !localStorage.getItem("device_id")) {
      localStorage.setItem("device_id", storedDeviceId);
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
  }, []);

  useEffect(() => {
    let active = true;
    const loadSignInSettings = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/login-method`);
        const method = ["password", "face", "both"].includes(data.loginMethod) ? data.loginMethod : "password";
        const savedFaceMode = data.faceMode === "trusted-device" ? "trusted-device" : "every-time";
        if (!active) return;
        setLoginMethod(method);
        setFaceMode(savedFaceMode);
        if (savedFaceMode !== "trusted-device") {
          localStorage.removeItem("face_trust_token");
        } else if (method !== "password") {
          const faceTrustToken = localStorage.getItem("face_trust_token");
          if (faceTrustToken) {
            try {
              const device_id = await getDeviceId();
              const response = await axios.post(`${API_URL}/login/face/trusted`, { faceTrustToken, device_id });
              if (!active) return;
              localStorage.setItem("token", response.data.token);
              if (response.data.role === "admin") {
                navigate("/admin-dashboard");
              } else {
                sessionStorage.setItem("studentActiveTab", "courses");
                navigate("/student");
              }
              return;
            } catch (trustedError) {
              if ([401, 403].includes(trustedError.response?.status)) {
                localStorage.removeItem("face_trust_token");
              }
            }
          }
        }
      } catch (requestError) {
        if (active) {
          setLoginMethod("password");
          setError(requestError.response?.data?.message || "Could not load sign-in options. Username and password remain available.");
        }
      } finally {
        if (active) setLoginMethodLoading(false);
      }
    };
    loadSignInSettings();
    return () => {
      active = false;
    };
  }, [API_URL]);

  useEffect(() => {
    if (!loginMethodLoading && loginMethod !== "face") usernameRef.current?.focus();
  }, [loginMethod, loginMethodLoading]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startFaceCamera = async () => {
    setError("");
    setFaceStatus("Starting camera and loading recognition models...");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access requires HTTPS or localhost.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "user" } },
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      faceApiRef.current = await loadFaceApiModels();
      setFaceStatus("Camera ready. Position your face and select Verify face.");
    } catch (cameraError) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
      setFaceStatus("");
      setError(cameraError.message || "Could not start face recognition. Check camera permission and model files.");
    }
  };

  const verifyFaceLogin = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !faceApiRef.current) {
      setError("The camera is not ready yet. Wait for the preview, then try again.");
      return;
    }

    setFaceLoading(true);
    setError("");
    setFaceStatus("Checking face...");
    try {
      const detections = await faceApiRef.current
        .detectAllFaces(video, new faceApiRef.current.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();
      const descriptor = detections[0]?.descriptor;
      if (!descriptor) {
        setFaceStatus("No face detected. Look at the camera and move into the frame.");
        return;
      }

      const device_id = await getDeviceId();
      const response = await axios.post(`${API_URL}/login/face`, {
        face_descriptor: Array.from(descriptor),
        device_id,
        device_name: navigator.userAgent,
      });
      if (response.data.faceTrustToken) {
        localStorage.setItem("face_trust_token", response.data.faceTrustToken);
      }
      localStorage.setItem("token", response.data.token);
      if (response.data.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        sessionStorage.setItem("studentActiveTab", "courses");
        navigate("/student");
      }
    } catch (faceError) {
      const message = faceError.response?.data?.message || faceError.message || "Face sign-in failed. Try again.";
      setFaceStatus(message);
      setError(message);
    } finally {
      setFaceLoading(false);
    }
  };

  const stopFaceCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setFaceStatus("");
  };

  const handleLogin = async (e) => {
     console.log("API_URL:", API_URL);
    e.preventDefault();
    setLoading(true);
    setError("");

    const device_id = await getDeviceId();
     console.log("API_URL 2:", API_URL);

    try {
      const res = await axios.post(`${API_URL}/login`, {
        user_name,
        password,
        device_id,
      });
      console.log("Login Response:", res.data,API_URL); // Log the response for debugging

      localStorage.setItem("token", res.data.token);

      if (res.data.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        // Students should start in the course/video view after signing in.
        sessionStorage.setItem("studentActiveTab", "courses");
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

          <div className="space-y-6">
            {loginMethodLoading && <p role="status" className="text-center text-sm text-blue-100">Loading sign-in options...</p>}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            {!loginMethodLoading && loginMethod !== "face" && <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">
                Username
              </label>
              <div className="relative group">
              {/*  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 transition-colors group-focus-within:text-blue-400" /> */}
                <input
                  ref={usernameRef}
                  type="text"
                  name="login-user"
                  autoComplete="off"
                  placeholder="Enter your username"
                  value={user_name}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                  className="w-full pl-2 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
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
              {/*  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 transition-colors group-focus-within:text-blue-400" />*/}
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  name="login-password"
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogin(e);
                    }
                  }}
                  className="w-full pl-2 pr-12 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
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
              type="button"
              onClick={handleLogin}
              disabled={loading}
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
            </div>}

            {!loginMethodLoading && loginMethod !== "password" && <section aria-labelledby="face-login-title" className="border-t border-white/20 pt-6">
              <div className="mb-4 flex items-center gap-3">
                <Camera className="h-5 w-5 text-blue-200" aria-hidden="true" />
                <h2 id="face-login-title" className="text-lg font-semibold text-white">Face Recognition</h2>
              </div>
              {cameraStream ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline aria-label="Circular face recognition camera preview" className="mx-auto aspect-square w-full max-w-72 rounded-full border-4 border-emerald-400/70 bg-slate-950 object-cover shadow-lg" />
                  <p role="status" className="mt-2 text-sm text-blue-100">{faceStatus}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={verifyFaceLogin} disabled={faceLoading} className="inline-flex items-center gap-2 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60">
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      {faceLoading ? "Verifying..." : "Verify face"}
                    </button>
                    <button type="button" onClick={stopFaceCamera} className="px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white">Stop camera</button>
                  </div>
                </>
              ) : (
                <>
                  <p role="status" className="mb-4 text-sm text-blue-100">{faceStatus || "Use your enrolled face to sign in."}</p>
                  <button type="button" onClick={startFaceCamera} className="inline-flex items-center gap-2 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Start face recognition
                  </button>
                </>
              )}
            </section>}
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
