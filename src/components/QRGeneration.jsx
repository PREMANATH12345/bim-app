import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import Loading from "../components/Loading";
import { Download, Link, FileScan, XCircle } from "lucide-react"; // ✅ Lucide icon for Clear
import toast from "react-hot-toast";

const QRGeneration = () => {
  const [qrText, setQrText] = useState(""); // Controlled input text
  const [generatedQRText, setGeneratedQRText] = useState(""); // Actual QR data shown
  const [loading, setLoading] = useState(false); // Optional loader
  const qrRef = useRef(); // Ref to access QR canvas for download

  // ✅ Generate QR from input
  const handleGenerate = () => {
    if (!qrText.trim()) return;
    setGeneratedQRText(qrText.trim());
  };

  // ✅ Download the QR code as image
  const handleDownload = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = "qr-code.png";
    downloadLink.click();

    toast.success("QR Code downloaded!");
  };

  // ✅ Reset QR when editing text
  const handleChange = (e) => {
    setQrText(e.target.value);
    setGeneratedQRText(""); // Reset preview
  };

  // ✅ Clear input and generated QR
  const handleClear = () => {
    setQrText("");
    setGeneratedQRText("");
    toast("Cleared");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar role="admin" />


      {/* Main content */}
      <div className="flex-1">
        <TopBar />

        <main className="p-4 sm:p-6 md:p-10">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-xl text-white">
              <FileScan size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                QR Code Generator
              </h2>
              <p className="text-sm text-gray-500">
                Generate and download student/course QR codes
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6 w-full">
              {/* Input field */}
              <div className="flex items-center gap-2 w-full sm:flex-1">
                <Link size={20} className="text-gray-500 hidden sm:block" />
                <input
                  type="text"
                  placeholder="Enter URL, Certificate ID, or Text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-indigo-200 focus:outline-none text-sm"
                  value={qrText}
                  onChange={handleChange}
                />
              </div>

              {/* Clear Button */}
              <button
                onClick={handleClear}
                disabled={!qrText}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg shadow hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={18} />
                Clear
              </button>

              {/* Generate or Download */}
              {generatedQRText ? (
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
                >
                  <Download size={18} />
                  Download
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!qrText.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate QR
                </button>
              )}
            </div>

            {/* QR Preview */}
            {/* hmark---------- */}
            {/* {generatedQRText && (
              <div
                ref={qrRef}
                className="flex justify-center items-center bg-gray-100 p-6 rounded-lg"
              >
                  <QRCodeCanvas value={generatedQRText} size={200} />

              </div>
            )} */}
            {generatedQRText && (
              <div
                ref={qrRef}
                className="flex justify-center items-center bg-gray-100 p-6 rounded-lg"
              >
                <QRCodeCanvas
                  value={generatedQRText}
                  size={200}
                  level="H"
                  marginSize={2}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Optional loading indicator */}
      {loading && <Loading />}
    </div>
  );
};

export default QRGeneration;
