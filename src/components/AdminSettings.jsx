import { useEffect, useRef, useState } from "react";
import {
	Camera,
	Check,
	Fingerprint,
	KeyRound,
	Laptop,
	Monitor,
	Save,
	ShieldCheck,
	Trash2,
	User,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AdminMobileNavBar from "./AdminMobileNavBar";
import { advanceFaceLivenessChallenge, createFaceLivenessChallenge } from "../utils/faceLiveness";

const DEFAULT_SETTINGS = { loginMethod: "password", faceEnabled: false, faceMode: "every-time" };
let faceApiModulePromise;

const loadFaceApiModels = () => {
	if (!faceApiModulePromise) {
		faceApiModulePromise = import("@vladmandic/face-api").then(async (faceapi) => {
			const modelUrl = "/models";
			await Promise.all([
				faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
				faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
				faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
			]);
			return faceapi;
		}).catch((error) => {
			faceApiModulePromise = null;
			throw error;
		});
	}
	return faceApiModulePromise;
};

const getSettingsKey = () => {
	try {
		const token = localStorage.getItem("token");
		const adminId = token ? jwtDecode(token)?.id : null;
		return `adminAuthSettings_${adminId || "default"}`;
	} catch {
		return "adminAuthSettings_default";
	}
};

const readSettings = (key) => {
	try {
		const stored = JSON.parse(localStorage.getItem(key) || "null");
		return {
			...DEFAULT_SETTINGS,
			...stored,
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
};

const getCurrentDeviceId = () => {
	let deviceId = localStorage.getItem("device_id");
	if (!deviceId) {
		deviceId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random()}`;
		localStorage.setItem("device_id", deviceId);
	}
	return deviceId;
};

const AdminSettings = () => {
	const contentRef = useRef(null);
	const navigate = useNavigate();
	const videoRef = useRef(null);
	const cameraStreamRef = useRef(null);
	const faceApiRef = useRef(null);
	const detectingRef = useRef(false);
	const livenessRef = useRef(createFaceLivenessChallenge());
	const livenessPassedAtRef = useRef(0);
	const livenessDescriptorRef = useRef(null);
	const settingsKey = getSettingsKey();
	const faceDescriptorKey = `${settingsKey}_face_descriptor`;
	const [settings, setSettings] = useState(() => readSettings(settingsKey));
	const [selectedLoginMethod, setSelectedLoginMethod] = useState(() => readSettings(settingsKey).loginMethod);
	const [savedFaceMode, setSavedFaceMode] = useState(() => readSettings(settingsKey).faceMode);
	const [notice, setNotice] = useState("");
	const [activeMethod, setActiveMethod] = useState("");
	const [userName, setUserName] = useState("");
	const [password, setPassword] = useState("");
	const [loginLoading, setLoginLoading] = useState(false);
	const [cameraStream, setCameraStream] = useState(null);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [modelsReady, setModelsReady] = useState(false);
	const [enrollingFace, setEnrollingFace] = useState(false);
	const [faceStatus, setFaceStatus] = useState("");
	const [faceEnrolled, setFaceEnrolled] = useState(false);
	const [trustedDevices, setTrustedDevices] = useState([]);
	const currentDeviceId = getCurrentDeviceId();
	const API_URL = import.meta.env.VITE_URL;

	useEffect(() => {
		const { loginMethod, faceMode, ...localSettings } = settings;
		localStorage.setItem(settingsKey, JSON.stringify(localSettings));
	}, [settings, settingsKey]);

	useEffect(() => {
		let active = true;
		const token = localStorage.getItem("token");
		localStorage.removeItem(faceDescriptorKey);
		axios.get(`${API_URL}/users/me/face-enrollment`, {
			headers: { Authorization: `Bearer ${token}` },
		}).then(({ data }) => {
			if (active) setFaceEnrolled(String(data.face_status).toLowerCase() === "enrolled");
		}).catch(() => {
			if (active) setFaceEnrolled(false);
		});
		return () => {
			active = false;
		};
	}, [API_URL, faceDescriptorKey]);

	useEffect(() => {
		const token = localStorage.getItem("token");
		axios.get(`${API_URL}/login-method`).then(async ({ data }) => {
			const legacyMethod = localStorage.getItem("adminLoginMethod");
			const loginMethod = data.configured
				? data.loginMethod
				: ["password", "face", "both"].includes(legacyMethod) ? legacyMethod : "password";
			setSelectedLoginMethod(loginMethod);
			const faceMode = data.faceMode === "trusted-device" ? "trusted-device" : "every-time";
			setSettings((current) => ({ ...current, loginMethod, faceMode }));
			setSavedFaceMode(faceMode);
			if (!data.configured && ["password", "face", "both"].includes(legacyMethod)) {
				await axios.put(
					`${API_URL}/settings/login-method`,
					{ loginMethod },
					{ headers: { Authorization: `Bearer ${token}` } },
				);
			}
		}).catch((error) => {
			setNotice(error.response?.data?.message || "Could not load the saved login method.");
		});
	}, [API_URL]);

	useEffect(() => {
		const token = localStorage.getItem("token");
		axios.get(`${API_URL}/users/me/trusted-face-devices`, {
			headers: { Authorization: `Bearer ${token}` },
		}).then(({ data }) => {
			setTrustedDevices(Array.isArray(data) ? data : []);
		}).catch((error) => {
			setNotice(error.response?.data?.message || "Could not load trusted devices.");
		});
	}, [API_URL]);

	useEffect(() => {
		if (videoRef.current && cameraStream) {
			videoRef.current.srcObject = cameraStream;
			videoRef.current.play().catch(() => {});
		}
	}, [cameraStream]);

	useEffect(() => () => {
		cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
	}, []);

	useEffect(() => {
		if (!cameraStream || !modelsReady) return undefined;
		let active = true;
		const detectFace = async () => {
			const video = videoRef.current;
			if (!active || detectingRef.current || !video || video.readyState < 2 || !video.videoWidth) return;
			detectingRef.current = true;
			try {
				const detections = await faceApiRef.current
					.detectAllFaces(video, new faceApiRef.current.SsdMobilenetv1Options())
					.withFaceLandmarks()
					.withFaceDescriptors();
				if (!active) return;
				if (detections.length !== 1) {
					livenessRef.current = createFaceLivenessChallenge();
					livenessPassedAtRef.current = 0;
					livenessDescriptorRef.current = null;
					setFaceStatus(detections.length ? "Only one face can be in frame during enrollment." : "No face detected. Look at the camera and move into the frame.");
					return;
				}
				if (livenessRef.current.complete && Date.now() - livenessPassedAtRef.current > 15000) {
					livenessRef.current = createFaceLivenessChallenge();
					livenessPassedAtRef.current = 0;
					livenessDescriptorRef.current = null;
				}
				const challengeWasComplete = livenessRef.current.complete;
				const liveness = advanceFaceLivenessChallenge(livenessRef.current, detections[0].landmarks);
				if (liveness.complete && !challengeWasComplete) {
					livenessDescriptorRef.current = Array.from(detections[0].descriptor);
					livenessPassedAtRef.current = Date.now();
				}
				setFaceStatus(liveness.status);
			} catch {
				if (active) setFaceStatus("Face detection failed. Check the camera and model files, then retry.");
			} finally {
				detectingRef.current = false;
			}
		};
		const intervalId = window.setInterval(detectFace, 180);
		detectFace();
		return () => {
			active = false;
			window.clearInterval(intervalId);
		};
	}, [cameraStream, faceEnrolled, modelsReady]);

	const stopCamera = () => {
		cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
		cameraStreamRef.current = null;
		setCameraStream(null);
		livenessRef.current = createFaceLivenessChallenge();
		livenessPassedAtRef.current = 0;
		livenessDescriptorRef.current = null;
	};

	const handleFaceRecognitionToggle = async (enabled) => {
		setNotice("");
		if (!enabled) {
			stopCamera();
			setModelsReady(false);
			setFaceStatus("");
			setSettings((current) => ({ ...current, faceEnabled: false }));
			return;
		}
		if (cameraStreamRef.current && modelsReady) return;

		if (!navigator.mediaDevices?.getUserMedia) {
			setNotice("Camera access is unavailable. Open this site over HTTPS or localhost and try again.");
			return;
		}

		try {
			if (!cameraStreamRef.current) {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: { facingMode: { ideal: "user" } },
				});
				cameraStreamRef.current = stream;
				setCameraStream(stream);
			}
			setModelsLoading(true);
			setFaceStatus("Loading face detection, landmark, and recognition models...");
			faceApiRef.current = await loadFaceApiModels();
			setModelsReady(true);
			setSettings((current) => ({ ...current, faceEnabled: true }));
			setFaceStatus("Models ready. Position your face in the camera.");
		} catch (error) {
			if (error.name === "NotAllowedError" || error.name === "NotFoundError" || error.name === "NotReadableError") {
				const message = error.name === "NotAllowedError"
					? "Camera permission was denied. Allow camera access in your browser settings, then try again."
					: "Could not open the camera. Check that it is connected and not being used by another app.";
				setNotice(message);
			} else {
				setNotice("Could not load the face models. Confirm all model files exist in public/models and try again.");
			}
			stopCamera();
			setModelsReady(false);
			setSettings((current) => ({ ...current, faceEnabled: false }));
		}
		setModelsLoading(false);
	};

	const enrollFace = async () => {
		const video = videoRef.current;
		if (!video || video.readyState < 2 || !video.videoWidth || !faceApiRef.current) {
			setNotice("The camera is not ready yet. Wait for the live preview, then try again.");
			return;
		}
		if (detectingRef.current) {
			setNotice("Face detection is in progress. Try again in a moment.");
			return;
		}
		if (Date.now() - livenessPassedAtRef.current > 15000 || !livenessDescriptorRef.current) {
			setFaceStatus("Blink once OR turn your head to either side, then face forward.");
			setNotice("Complete the live blink or head-turn check before enrolling.");
			return;
		}

		detectingRef.current = true;
		setEnrollingFace(true);
		setNotice("");
		try {
			setFaceStatus("Capturing face from the camera...");
			const detections = await faceApiRef.current
				.detectAllFaces(video, new faceApiRef.current.SsdMobilenetv1Options())
				.withFaceLandmarks()
				.withFaceDescriptors();
			if (detections.length !== 1) {
				setFaceStatus(detections.length ? "Only one face can be in frame during enrollment." : "No face detected. Look at the camera and move into the frame.");
				setNotice("Exactly one face must be visible during enrollment.");
				return;
			}
			if (Date.now() - livenessPassedAtRef.current > 15000 || !livenessDescriptorRef.current) {
				setNotice("The liveness check expired. Complete it again before enrolling.");
				return;
			}
			const descriptor = livenessDescriptorRef.current;
			if (!descriptor) {
				setFaceStatus("No face detected. Look at the camera and move into the frame.");
				setNotice("A face must be visible in the camera before it can be enrolled.");
				return;
			}
			const capturedDescriptor = Array.from(descriptor);
			const token = localStorage.getItem("token");
			await axios.put(
				`${API_URL}/users/me/face-enrollment`,
				{ face_descriptor: capturedDescriptor },
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			localStorage.removeItem(faceDescriptorKey);
			setFaceEnrolled(true);
			setFaceStatus("Face captured and enrollment saved.");
			setNotice("Face enrollment saved for this account.");
		} catch (error) {
			setFaceStatus("Face capture or enrollment failed. Try again.");
			setNotice(error.response?.data?.message || "Could not save face enrollment. Try again.");
		} finally {
			detectingRef.current = false;
			setEnrollingFace(false);
		}
	};

	const removeFaceEnrollment = async () => {
		try {
			const token = localStorage.getItem("token");
			await axios.delete(`${API_URL}/users/me/face-enrollment`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			localStorage.removeItem(faceDescriptorKey);
			setFaceEnrolled(false);
			setNotice("Face enrollment was removed from this account.");
		} catch (error) {
			setNotice(error.response?.data?.message || "Could not remove face enrollment. Try again.");
		}
	};

	const handleCredentialLogin = async (event) => {
		e.preventDefault();
		setNotice("");
		setLoginLoading(true);
		try {
			let deviceId = localStorage.getItem("device_id");
			if (!deviceId) {
				deviceId = globalThis.crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
				localStorage.setItem("device_id", deviceId);
			}
			const response = await axios.post(`${API_URL}/login`, {
				user_name: userName,
				password,
				device_id: deviceId,
			});
			localStorage.setItem("token", response.data.token);
			if (response.data.role === "admin") {
				navigate("/admin-dashboard");
			} else {
				sessionStorage.setItem("studentActiveTab", "courses");
				navigate("/student");
			}
		} catch (error) {
			setNotice(error.response?.data?.message || "Login failed. Check your username and password.");
		} finally {
			setLoginLoading(false);
		}
	};

	const selectFaceMethod = () => {
		setActiveMethod("face");
		if (!cameraStreamRef.current || !modelsReady) handleFaceRecognitionToggle(true);
	};

	const unlinkDevice = async (deviceId) => {
		try {
			const token = localStorage.getItem("token");
			await axios.delete(`${API_URL}/users/me/trusted-face-devices/${deviceId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (trustedDevices.find((device) => device.id === deviceId)?.device_id === currentDeviceId) {
				localStorage.removeItem("face_trust_token");
			}
			setTrustedDevices((current) => current.filter((device) => device.id !== deviceId));
			setNotice("Trusted device unlinked.");
		} catch (error) {
			setNotice(error.response?.data?.message || "Could not unlink trusted device.");
		}
	};

	const linkCurrentDevice = async () => {
		try {
			const token = localStorage.getItem("token");
			const { data } = await axios.post(
				`${API_URL}/users/me/trusted-face-devices`,
				{
					device_id: currentDeviceId,
					device_name: navigator.userAgent,
				},
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			localStorage.setItem("face_trust_token", data.faceTrustToken);
			const devices = await axios.get(`${API_URL}/users/me/trusted-face-devices`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setTrustedDevices(Array.isArray(devices.data) ? devices.data : []);
			setNotice(data.message);
		} catch (error) {
			setNotice(error.response?.data?.message || "Could not link this device.");
		}
	};

	const saveLoginMethod = async () => {
		const savedSettings = { ...settings, loginMethod: selectedLoginMethod };
		try {
			const token = localStorage.getItem("token");
			await axios.put(
				`${API_URL}/settings/login-method`,
				{ loginMethod: selectedLoginMethod, faceMode: settings.faceMode },
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			setSettings(savedSettings);
			setSavedFaceMode(settings.faceMode);
			if (settings.faceMode === "every-time") setTrustedDevices([]);
			setNotice("Login settings saved for students and administrators.");
		} catch (error) {
			setNotice(error.response?.data?.message || "Could not save the login method.");
		}
	};

	return (
		<div className="flex h-screen bg-slate-50">
			<Sidebar role="admin" />
			<div className="flex min-w-0 flex-1 flex-col">
				<TopBar />
				<main
					ref={contentRef}
					className="flex-1 overflow-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8"
				>
					<div className="mx-auto max-w-5xl">
						<header className="mb-7 border-b border-slate-200 pb-5">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Security</p>
							<h1 className="mt-1 text-2xl font-bold text-slate-900">Login settings</h1>
							<p className="mt-2 max-w-2xl text-sm text-slate-600">
								Choose the sign-in methods available to students and administrators.
							</p>
						</header>

						{notice && (
							<div role="status" className="mb-5 border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
								{notice}
							</div>
						)}

						<div className="mb-5 flex flex-wrap items-center justify-end gap-3">
										{selectedLoginMethod === settings.loginMethod && settings.faceMode === savedFaceMode && <span className="text-sm text-slate-500">Current settings are saved.</span>}
										<button
											type="button"
											onClick={saveLoginMethod}
											disabled={selectedLoginMethod === settings.loginMethod && settings.faceMode === savedFaceMode}
											className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
										>
											<Save className="h-4 w-4" aria-hidden="true" />
											Save login settings
										</button>
						</div>
								<section aria-labelledby="login-methods-title">
							<div className="mb-3 flex items-center gap-2">
								<ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
								<h2 id="login-methods-title" className="text-lg font-semibold text-slate-900">Login Methods</h2>
							</div>

							<div className="mb-5 grid gap-3 md:grid-cols-3">
								{[
									{ id: "password", title: "Normal Login System", detail: "Username and password", icon: KeyRound },
									{ id: "face", title: "Face Recognition", detail: "Verify with an enrolled face", icon: User },
									{ id: "both", title: "Both Login Methods", detail: "Username/password and face recognition", icon: ShieldCheck },
								].map((method) => {
									const MethodIcon = method.icon;
									const selected = selectedLoginMethod === method.id;
									return (
										<button
											key={method.id}
											type="button"
											onClick={() => setSelectedLoginMethod(method.id)}
											aria-pressed={selected}
											className={`relative flex min-h-36 flex-col items-start border p-4 text-left transition ${selected ? "border-emerald-700 bg-emerald-50/60 ring-1 ring-emerald-700" : "border-slate-200 bg-white hover:border-slate-400"}`}
										>
											<span className={`mb-4 rounded-md p-2 ${selected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
												<MethodIcon className="h-5 w-5" aria-hidden="true" />
											</span>
											<span className="font-semibold text-slate-900">{method.title}</span>
											<span className="mt-1 text-sm text-slate-600">{method.detail}</span>
											{selected && <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-700" aria-label="Selected" />}
										</button>
									);
								})}
							</div>
							<div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
								{selectedLoginMethod !== "face" && <div>
									<button
										type="button"
										onClick={() => setActiveMethod(activeMethod === "password" ? "" : "password")}
										aria-expanded={activeMethod === "password"}
										className="flex w-full items-start gap-4 px-4 py-5 text-left hover:bg-slate-50 sm:px-6"
									>
										<span className="rounded-md bg-slate-100 p-2 text-slate-700">
											<KeyRound className="h-5 w-5" aria-hidden="true" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="flex flex-wrap items-center gap-2">
												<span className="font-semibold text-slate-900">Username and password</span>
												<span className="rounded-sm bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Available</span>
											</span>
											<span className="mt-1 block text-sm text-slate-600">Sign in with your existing username and password.</span>
										</span>
									</button>
									{activeMethod === "password" && (
										<form onSubmit={handleCredentialLogin} autoComplete="off" className="grid max-w-xl gap-4 px-4 pb-6 sm:px-6">
											<label className="grid gap-1.5 text-sm font-medium text-slate-700">
												Username
												<input type="text" name="admin-login-user" autoComplete="off" required value={userName} onChange={(event) => setUserName(event.target.value)} className="w-full border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20" placeholder="Enter username" />
											</label>
											<label className="grid gap-1.5 text-sm font-medium text-slate-700">
												Password
												<input type="password" name="admin-login-password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20" placeholder="Enter password" />
											</label>
											<button type="submit" disabled={loginLoading} className="inline-flex w-fit items-center gap-2 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">
												{loginLoading ? "Signing in..." : "Sign in"}
											</button>
										</form>
									)}
									</div>}

								{selectedLoginMethod !== "password" &&
								<div className="px-4 py-5 sm:px-6">
									<div className="flex items-start gap-4">
										<div className="rounded-md bg-emerald-50 p-2 text-emerald-800">
											<User className="h-5 w-5" aria-hidden="true" />
										</div>
										<div className="min-w-0 flex-1">
											<button type="button" onClick={selectFaceMethod} aria-expanded={activeMethod === "face"} className="flex w-full flex-wrap items-center justify-between gap-3 text-left">
												<span>
													<span className="block font-semibold text-slate-900">Face recognition</span>
													<span className="mt-1 block text-sm text-slate-600">Open the front camera and start face verification.</span>
												</span>
												<span className="inline-flex items-center gap-2 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
													<Camera className="h-4 w-4" aria-hidden="true" />
													{cameraStream ? "Camera active" : "Open camera"}
												</span>
											</button>

											{activeMethod === "face" && <>
											<fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
												<label className={`flex cursor-pointer gap-3 border p-4 ${settings.faceMode === "every-time" ? "border-emerald-700 bg-emerald-50/60" : "border-slate-200"}`}>
													<input
														type="radio"
														name="face-mode"
														value="every-time"
														checked={settings.faceMode === "every-time"}
														onChange={() => setSettings((current) => ({ ...current, faceMode: "every-time" }))}
														className="mt-1 accent-emerald-700"
													/>
													<span>
														<span className="block text-sm font-semibold text-slate-900">Every sign-in</span>
														<span className="mt-1 block text-sm text-slate-600">Ask for face verification each time you sign in.</span>
													</span>
												</label>
												<label className={`flex cursor-pointer gap-3 border p-4 ${settings.faceMode === "trusted-device" ? "border-emerald-700 bg-emerald-50/60" : "border-slate-200"}`}>
													<input
														type="radio"
														name="face-mode"
														value="trusted-device"
														checked={settings.faceMode === "trusted-device"}
														onChange={() => setSettings((current) => ({ ...current, faceMode: "trusted-device" }))}
														className="mt-1 accent-emerald-700"
													/>
													<span>
														<span className="block text-sm font-semibold text-slate-900">Single-time on linked devices</span>
														<span className="mt-1 block text-sm text-slate-600">Verify once, then trust that browser until it is unlinked.</span>
													</span>
												</label>
											</fieldset>
											{cameraStream && (
												<div className="mt-5 max-w-sm">
													<video
														ref={videoRef}
														autoPlay
														muted
														playsInline
														aria-label="Front camera preview"
														className="aspect-video w-full bg-slate-950 object-cover"
													/>
													<div className="mt-2 flex items-center justify-between gap-3">
														<p className="text-xs text-slate-600">{modelsLoading ? "Loading models..." : faceStatus || "Preparing face recognition..."}</p>
														<button type="button" onClick={() => handleFaceRecognitionToggle(false)} className="text-sm font-medium text-rose-700 hover:underline">
															Stop camera
														</button>
													</div>
													<div className="mt-3 flex flex-wrap gap-2">
														<button
															type="button"
															onClick={enrollFace}
															disabled={!modelsReady || modelsLoading || enrollingFace}
															className="bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
														>
															{enrollingFace ? "Capturing face..." : faceEnrolled ? "Capture and update face" : "Capture and enroll face"}
														</button>
														{faceEnrolled && (
															<button
																type="button"
																onClick={removeFaceEnrollment}
																className="border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
															>
																Remove enrolled face
															</button>
														)}
													</div>
												</div>
											)}
											{!cameraStream && (
												<p className="mt-4 text-sm text-slate-600">Select Open camera to allow camera access and initialize face recognition.</p>
											)}
											</>}
										</div>
									</div>
								</div>}
							</div>
						</section>

						<section aria-labelledby="linked-devices-title" className="mt-8">
							<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
								<div>
									<h2 id="linked-devices-title" className="text-lg font-semibold text-slate-900">Linked devices</h2>
									<p className="mt-1 text-sm text-slate-600">Link this browser for single-time sign-in. Only one browser can be linked to this account.</p>
								</div>
								{settings.faceMode === "trusted-device" && selectedLoginMethod !== "password" && (
									<button
										type="button"
										onClick={linkCurrentDevice}
										disabled={savedFaceMode !== "trusted-device" || selectedLoginMethod !== settings.loginMethod}
										className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
									>
										<Laptop className="h-4 w-4" aria-hidden="true" />
										Link this device
									</button>
								)}
							</div>

							<div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
								{trustedDevices.length ? trustedDevices.map((device) => (
									<div key={device.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
										<Monitor className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium text-slate-900">
												{device.device_name}{device.device_id === currentDeviceId ? " (this device)" : ""}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												Last used {device.last_used_at ? new Date(device.last_used_at).toLocaleString() : "date unavailable"}
											</p>
										</div>
										<button
											type="button"
											onClick={() => unlinkDevice(device.id)}
											aria-label={`Unlink ${device.device_name}`}
											className="inline-flex items-center gap-2 px-2 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
										>
											<Trash2 className="h-4 w-4" aria-hidden="true" />
											Unlink
										</button>
									</div>
								)) : (
									<p className="px-4 py-6 text-sm text-slate-500 sm:px-6">No linked devices.</p>
								)}
							</div>
						</section>

						<p className="mt-6 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
							Login methods, face sign-in mode, face enrollment, and trusted browsers are stored in the database. A trusted browser is linked only after successful face verification.
						</p>
					</div>
				</main>
				<AdminMobileNavBar scrollContainerRef={contentRef} />
			</div>
		</div>
	);
};

export default AdminSettings;

