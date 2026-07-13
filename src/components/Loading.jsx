import { Loader2 } from "lucide-react";

const Loading = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl p-10 max-w-sm mx-4 text-center shadow-2xl border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-blue-100 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {message ? "Processing..." : "Loading"}
        </h2>
        <p className="text-gray-600 font-medium">
          {message || "Please wait while we process your request..."}
        </p>
        {message && (
          <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold animate-pulse border border-red-100">
            ⚠️ DO NOT CLOSE OR REFRESH THIS PAGE
          </div>
        )}
      </div>
    </div>
  );
};

export default Loading;