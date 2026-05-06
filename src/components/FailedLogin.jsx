import React, { useEffect, useState } from "react";
import { AlertTriangle, User, Clock, Shield } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Loading from "./Loading";

const FailedLogin = () => {
  const [failedLogins, setFailedLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_URL;
  const token = localStorage.getItem("token");

  const fetchFailedLogins = async () => {
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/failed-logins`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch failed logins");

      const data = await res.json();
      setFailedLogins(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedLogins();

    return () => {
      setFailedLogins([]);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Failed Login Attempts
              </h1>
            </div>
            <p className="text-gray-600">
              Monitor unauthorized access attempts
            </p>
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
              {error}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                        User ID
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                        Attempted At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {failedLogins.length > 0 ? (
                      failedLogins.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <span className="font-medium text-gray-900">
                                {log.user_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {log.name}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {log.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(log.attempted_at).toLocaleString()}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center">
                            <Shield className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium mb-2">
                              No Failed Login Attempts
                            </p>
                            <p>
                              Your system is secure! No unauthorized access
                              attempts detected.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden">
                {failedLogins.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {failedLogins.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {log.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {log.user_id}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Role</p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                log.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {log.role}
                            </span>
                          </div>
                          <div>
                            <p className="text-gray-500">Attempted</p>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(
                                  log.attempted_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">
                      No Failed Login Attempts
                    </p>
                    <p>
                      Your system is secure! No unauthorized access attempts
                      detected.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FailedLogin;
