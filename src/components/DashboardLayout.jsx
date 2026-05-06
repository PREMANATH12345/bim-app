// components/DashboardLayout.jsx
import React from "react";
import Sidebar from "./Sidebar";

const DashboardLayout = ({ children, role }) => {
  return (
    <div className="flex bg-gray-100 ">
      <Sidebar role={role} />
      <main className="flex-1 p-y-4 ">{children}</main>
    </div>
  );
};

export default DashboardLayout;
