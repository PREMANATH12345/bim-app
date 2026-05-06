import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const getUserRole = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return null;
    }

    return decoded.role;
  } catch (error) {
    console.error("Invalid token:", error);
    localStorage.removeItem("token");
    return null;
  }
};

const PrivateRoute = ({ allowedRoles }) => {
  const userRole = getUserRole();
  const isAuthorized = allowedRoles.includes(userRole);

  if (!isAuthorized) {
    // Redirect to login page if not authorized
    return <Navigate to="/" replace />;
  }

  // Render child routes if authorized
  return <Outlet />;
};

export default PrivateRoute;
