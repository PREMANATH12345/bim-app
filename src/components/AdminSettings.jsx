import React, { useEffect, useRef, useState } from "react";
import {
	Check,
	KeyRound,
	Save,
	Shield,
	ShieldCheck,
	UserCheck,
	RefreshCw,
	Info,
	X,
	Lock,
	Laptop,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AdminMobileNavBar from "./AdminMobileNavBar";

const AdminSettings = () => {
	const contentRef = useRef(null);
	const API_URL = import.meta.env.VITE_URL;

	const [selectedLoginMethod, setSelectedLoginMethod] = useState("password");
	const [savedLoginMethod, setSavedLoginMethod] = useState("password");
	const [faceMode, setFaceMode] = useState("every-time");
	const [savedFaceMode, setSavedFaceMode] = useState("every-time");
	const [notice, setNotice] = useState("");
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const hasUnsavedChanges =
		selectedLoginMethod !== savedLoginMethod || faceMode !== savedFaceMode;

	const isFaceEnabled = selectedLoginMethod !== "password";
	const isTrustedDeviceEnabled = faceMode === "trusted-device";

	// Fetch current settings on load
	useEffect(() => {
		const token = localStorage.getItem("token");
		axios
			.get(`${API_URL}/login-method`)
			.then(async ({ data }) => {
				const legacyMethod = localStorage.getItem("adminLoginMethod");
				const method = data.configured
					? data.loginMethod
					: ["password", "face", "both"].includes(legacyMethod)
					? legacyMethod
					: "password";
				const mode = data.faceMode === "trusted-device" ? "trusted-device" : "every-time";

				setSelectedLoginMethod(method);
				setSavedLoginMethod(method);
				setFaceMode(mode);
				setSavedFaceMode(mode);

				if (!data.configured && ["password", "face", "both"].includes(legacyMethod)) {
					await axios.put(
						`${API_URL}/settings/login-method`,
						{ loginMethod: method, faceMode: mode },
						{ headers: { Authorization: `Bearer ${token}` } }
					);
				}
			})
			.catch((error) => {
				const msg = error.response?.data?.message || "Could not load login settings.";
				setNotice(msg);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [API_URL]);

	const saveSettings = async () => {
		setIsSaving(true);
		try {
			const token = localStorage.getItem("token");
			await axios.put(
				`${API_URL}/settings/login-method`,
				{ loginMethod: selectedLoginMethod, faceMode },
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setSavedLoginMethod(selectedLoginMethod);
			setSavedFaceMode(faceMode);
			localStorage.setItem("adminLoginMethod", selectedLoginMethod);

			setNotice("Login settings saved successfully.");
			toast.success("Settings saved successfully!");
		} catch (error) {
			const msg = error.response?.data?.message || "Could not save settings. Please try again.";
			setNotice(msg);
			toast.error(msg);
		} finally {
			setIsSaving(false);
		}
	};

	const toggleFaceRecognition = () => {
		if (isFaceEnabled) {
			// Disable face recognition -> revert to normal password
			setSelectedLoginMethod("password");
		} else {
			// Enable face recognition -> default to both
			setSelectedLoginMethod("both");
		}
	};

	const toggleTrustedDevice = () => {
		setFaceMode((prev) => (prev === "trusted-device" ? "every-time" : "trusted-device"));
	};

	const loginMethods = [
		{
			id: "password",
			title: "Username & Password",
			badge: "Standard",
			detail: "Sign in with conventional credentials. Standard security suitable for all users.",
			icon: KeyRound,
			gradient: "from-blue-600 to-indigo-600",
		},
		{
			id: "face",
			title: "Face Recognition",
			badge: "Biometric AI",
			detail: "Biometric authentication using real-time facial recognition verification.",
			icon: UserCheck,
			gradient: "from-purple-600 to-indigo-600",
		},
		{
			id: "both",
			title: "Both Login Methods",
			badge: "Flexible Hybrid",
			detail: "Allow users to choose between password or facial recognition at the login screen.",
			icon: ShieldCheck,
			gradient: "from-emerald-600 to-teal-600",
		},
	];

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar role="admin" />
			<div className="flex-1 flex flex-col min-w-0">
				<TopBar />
				<main
					ref={contentRef}
					className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 bg-slate-50 overflow-auto"
				>
					<div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
						{/* Header Section */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
							<div className="flex items-center gap-3">
								<div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-100 text-white flex-shrink-0">
									<ShieldCheck className="w-6 h-6" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
											Login Settings
										</h1>
										<span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
											Admin Controls
										</span>
									</div>
									<p className="text-slate-500 text-xs sm:text-sm mt-0.5">
										Manage authentication methods and biometric sign-in preferences for the platform.
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3 self-end sm:self-auto">
								{hasUnsavedChanges && (
									<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
										<span className="w-2 h-2 rounded-full bg-amber-500" />
										Unsaved changes
									</span>
								)}
								<button
									type="button"
									onClick={saveSettings}
									disabled={!hasUnsavedChanges || isSaving || loading}
									className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
								>
									{isSaving ? (
										<RefreshCw className="w-4 h-4 animate-spin" />
									) : (
										<Save className="w-4 h-4" />
									)}
									<span>{isSaving ? "Saving..." : "Save Settings"}</span>
								</button>
							</div>
						</div>

						{/* Notice / Alert Banner */}
						{notice && (
							<div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 text-indigo-950 text-sm shadow-sm transition-all">
								<Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
								<div className="flex-1 font-medium leading-relaxed">{notice}</div>
								<button
									type="button"
									onClick={() => setNotice("")}
									className="text-slate-400 hover:text-slate-600 transition"
									aria-label="Dismiss notice"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						)}

						{/* SECTION 1: Login Methods Selection */}
						<section aria-labelledby="methods-heading">
							<div className="mb-3 sm:mb-4">
								<h2 id="methods-heading" className="text-base sm:text-lg font-bold text-slate-800">
									Authentication Methods
								</h2>
								<p className="text-xs sm:text-sm text-slate-500">
									Choose which login method is available to students and administrators.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{loginMethods.map((method) => {
									const Icon = method.icon;
									const isSelected = selectedLoginMethod === method.id;
									return (
										<button
											key={method.id}
											type="button"
											onClick={() => setSelectedLoginMethod(method.id)}
											className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
												isSelected
													? "border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-md shadow-indigo-100/50"
													: "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
											}`}
										>
											<div>
												<div className="flex items-start justify-between gap-3 mb-4">
													<div
														className={`p-2.5 rounded-xl transition-all ${
															isSelected
																? `bg-gradient-to-br ${method.gradient} text-white shadow-md shadow-indigo-200`
																: "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
														}`}
													>
														<Icon className="w-5 h-5" />
													</div>
													<div className="flex items-center gap-1.5">
														<span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
															{method.badge}
														</span>
														<div
															className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
																isSelected
																	? "bg-indigo-600 border-indigo-600 text-white"
																	: "border-slate-300 bg-white"
															}`}
														>
															{isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
														</div>
													</div>
												</div>
												<h3 className="font-bold text-slate-800 text-base mb-1">
													{method.title}
												</h3>
												<p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
													{method.detail}
												</p>
											</div>

											<div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
												<span className={isSelected ? "font-semibold text-indigo-600" : "text-slate-400"}>
													{isSelected ? "Selected" : "Click to select"}
												</span>
												{isSelected && (
													<span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
												)}
											</div>
										</button>
									);
								})}
							</div>
						</section>

						{/* SECTION 2: Enable / Disable Options */}
						<section aria-labelledby="toggles-heading" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-7 space-y-6">
							<div>
								<h2 id="toggles-heading" className="text-base sm:text-lg font-bold text-slate-800">
									Enable / Disable Options
								</h2>
								<p className="text-xs sm:text-sm text-slate-500">
									Quickly toggle facial recognition and trusted device verification settings.
								</p>
							</div>

							<div className="divide-y divide-slate-100">
								{/* Option 1: Face Recognition Enable / Disable */}
								<div className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
									<div className="flex items-start gap-3.5">
										<div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0 mt-0.5">
											<UserCheck className="w-5 h-5" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="text-sm font-bold text-slate-800">
													Face Recognition Login
												</h3>
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
														isFaceEnabled
															? "bg-emerald-50 text-emerald-700 border border-emerald-200"
															: "bg-slate-100 text-slate-600 border border-slate-200"
													}`}
												>
													{isFaceEnabled ? "Enabled" : "Disabled"}
												</span>
											</div>
											<p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-xl">
												Allow administrators and students to authenticate using biometric face recognition. When disabled, only username and password can be used.
											</p>
										</div>
									</div>

									<div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
										<button
											type="button"
											role="switch"
											aria-checked={isFaceEnabled}
											onClick={toggleFaceRecognition}
											className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
												isFaceEnabled ? "bg-indigo-600" : "bg-slate-300"
											}`}
										>
											<span
												className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
													isFaceEnabled ? "translate-x-5" : "translate-x-0"
												}`}
											/>
										</button>
									</div>
								</div>

								{/* Option 2: Trusted Device (Single-Time Verification) Enable / Disable */}
								<div className={`py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${
									isFaceEnabled ? "opacity-100" : "opacity-50"
								}`}>
									<div className="flex items-start gap-3.5">
										<div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
											<Laptop className="w-5 h-5" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="text-sm font-bold text-slate-800">
													Trusted Device Mode (Single-Time Verification)
												</h3>
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
														isTrustedDeviceEnabled && isFaceEnabled
															? "bg-emerald-50 text-emerald-700 border border-emerald-200"
															: "bg-slate-100 text-slate-600 border border-slate-200"
													}`}
												>
													{isTrustedDeviceEnabled && isFaceEnabled ? "Enabled" : "Disabled"}
												</span>
											</div>
											<p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-xl">
												When enabled, user verifies their face once and the device is remembered with a secure token. When disabled, face verification is required every time.
											</p>
										</div>
									</div>

									<div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
										<button
											type="button"
											role="switch"
											disabled={!isFaceEnabled}
											aria-checked={isTrustedDeviceEnabled}
											onClick={toggleTrustedDevice}
											className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
												!isFaceEnabled
													? "bg-slate-200 cursor-not-allowed"
													: isTrustedDeviceEnabled
													? "bg-indigo-600 cursor-pointer"
													: "bg-slate-300 cursor-pointer"
											}`}
										>
											<span
												className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
													isTrustedDeviceEnabled ? "translate-x-5" : "translate-x-0"
												}`}
											/>
										</button>
									</div>
								</div>
							</div>
						</section>

						{/* Security Note Footnote */}
						<div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 flex items-start gap-3">
							<Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
							<p className="text-xs text-slate-600 leading-relaxed">
								Selected login configurations apply instantly across the platform for students and administrators upon clicking <strong className="text-slate-800">Save Settings</strong>.
							</p>
						</div>
					</div>
				</main>
				<AdminMobileNavBar scrollContainerRef={contentRef} />
			</div>
		</div>
	);
};

export default AdminSettings;
