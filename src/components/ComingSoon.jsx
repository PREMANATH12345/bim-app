import React from "react";
const ComingSoon = ({ title }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-3">{title}</h1>
      <p className="text-gray-500 text-lg">This page is coming soon.</p>
    </div>
  );
};

export default ComingSoon;
