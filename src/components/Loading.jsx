import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full animate-ping"></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading</h2>
        <p className="text-gray-600">Please wait while we process your request...</p>
      </div>
    </div>
  );
};

export default Loading;