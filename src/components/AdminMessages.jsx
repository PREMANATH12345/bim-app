import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import Loading from "../components/Loading";
import { MessageSquare, Send, X, Users as UsersIcon, Search, Inbox, User, Reply } from "lucide-react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

const AdminMessages = () => {
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_URL;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [heading, setHeading] = useState("");
  const [messageText, setMessageText] = useState("");
  // "all" -> every user, "batch" -> one or more selected batches,
  // "user" -> one or more specific students
  const [target, setTarget] = useState("all");

  const [batchesList, setBatchesList] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const batchBoxRef = useRef(null);

  const [usersList, setUsersList] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // [{id, label}]
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const userBoxRef = useRef(null);

  const [sentMessages, setSentMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("sent");
  const [showCompose, setShowCompose] = useState(false);
  // Drives the slide-up entrance transition on the compose card (mounted
  // first, then flipped a tick later so the transition actually animates).
  const [composeVisible, setComposeVisible] = useState(false);

  useEffect(() => {
    if (showCompose) {
      const frame = requestAnimationFrame(() => setComposeVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setComposeVisible(false);
  }, [showCompose]);
  const [studentQueries, setStudentQueries] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // ---- Fetch batches, students, and message history ----
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [batchesRes, usersRes, messagesRes, queriesRes] = await Promise.all([
          fetch(`${API_URL}/batches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/messages/all`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/messages/queries`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const batchesData = await batchesRes.json();
        setBatchesList(Array.isArray(batchesData.batches) ? batchesData.batches : []);

        const usersData = await usersRes.json();
        const students = Array.isArray(usersData)
          ? usersData.filter((u) => u.role !== "admin")
          : [];
        setUsersList(students);

        const messagesData = await messagesRes.json();
        setSentMessages(Array.isArray(messagesData.messages) ? messagesData.messages : []);

        const queriesData = await queriesRes.json();
        const queries = Array.isArray(queriesData.queries) ? queriesData.queries : [];
        setStudentQueries(queries);

        // Opening this page counts as "seeing" every query received so far —
        // remember the newest one's timestamp so the bell's red dot (shown
        // on every admin page) clears and stays cleared until a newer query
        // comes in.
        try {
          const adminId = jwtDecode(token)?.id;
          const latest = queries.reduce((max, q) => {
            const t = q.created_at ? new Date(q.created_at).getTime() : 0;
            return t > max ? t : max;
          }, 0);
          if (latest > 0) {
            localStorage.setItem(`adminQueriesLastSeen_${adminId}`, String(latest));
          }
        } catch {
          // ignore - unread indicator is best-effort only
        }
      } catch (err) {
        console.error("Error loading Messages page:", err);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [API_URL, token]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (batchBoxRef.current && !batchBoxRef.current.contains(e.target)) {
        setBatchDropdownOpen(false);
      }
      if (userBoxRef.current && !userBoxRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleBatch = (name) => {
    setSelectedBatches((prev) =>
      prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]
    );
  };

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, { id: user.id, label: `${user.name} (${user.user_name})` }]
    );
  };

  const matchingBatchOptions = batchesList
    .filter((b) => b.name && !selectedBatches.includes(b.name))
    .filter(
      (b) =>
        !batchSearch.trim() || b.name.toLowerCase().includes(batchSearch.trim().toLowerCase())
    );

  const matchingUserOptions = usersList
    .filter((u) => !selectedUsers.some((s) => s.id === u.id))
    .filter((u) => {
      const q = userSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.user_name || "").toLowerCase().includes(q)
      );
    });

  const resetRecipients = () => {
    setSelectedBatches([]);
    setSelectedUsers([]);
    setBatchSearch("");
    setUserSearch("");
  };

  const resetCompose = () => {
    setHeading("");
    setMessageText("");
    setTarget("all");
    resetRecipients();
    setBatchDropdownOpen(false);
    setUserDropdownOpen(false);
    setShowCompose(false);
  };

  const handleSend = async () => {
    if (!heading.trim()) {
      toast.error("Please add a heading first");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Please type a message");
      return;
    }
    if (target === "batch" && selectedBatches.length === 0) {
      toast.error("Select at least one batch");
      return;
    }
    if (target === "user" && selectedUsers.length === 0) {
      toast.error("Select at least one student");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heading: heading.trim(),
          message: messageText.trim(),
          target,
          batches: selectedBatches,
          userIds: selectedUsers.map((u) => u.id),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      toast.success("Message sent!");
      resetCompose();

      // Refresh history
      const messagesRes = await fetch(`${API_URL}/messages/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const messagesData = await messagesRes.json();
      setSentMessages(Array.isArray(messagesData.messages) ? messagesData.messages : []);
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (queryId) => {
    if (!replyText.trim()) {
      toast.error("Please type a reply");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/messages/query/${queryId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to reply");
      toast.success("Reply sent!");
      setReplyTo(null);
      setReplyText("");
      const queriesRes = await fetch(`${API_URL}/messages/queries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const queriesData = await queriesRes.json();
      setStudentQueries(Array.isArray(queriesData.queries) ? queriesData.queries : []);
    } catch (err) {
      toast.error(err.message || "Failed to reply");
    }
  };

  const describeTarget = (row) => {
    if (row.target_type === "all") return "All Users";
    if (row.target_type === "batch") return `Batch ${row.target_value}`;
    if (row.target_type === "user") {
      const u = usersList.find((usr) => String(usr.id) === String(row.target_value));
      return u ? `${u.name} (${u.user_name})` : `Student #${row.target_value}`;
    }
    return row.target_type;
  };

  if (loading) return <Loading />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1">
        <TopBar />

        <main className="p-4 sm:p-6 md:p-10">
          {/* Page Header */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-xl text-white">
                <MessageSquare size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Messages</h2>
                <p className="text-sm text-gray-500">
                  Send a message to a batch, specific students, or everyone
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab("sent");
                setShowCompose(true);
              }}
              disabled={showCompose}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow transition ${
                showCompose
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              <Send size={16} />
              Send
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setActiveTab("sent"); resetCompose(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === "sent"
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg ring-2 ring-blue-300 scale-[1.03]"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <MessageSquare size={18} />
              Sent Messages
            </button>
            <button
              onClick={() => { setActiveTab("queries"); resetCompose(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === "queries"
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg ring-2 ring-orange-300 scale-[1.03]"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Inbox size={18} />
              Student Queries
              {studentQueries.length > 0 && (
                <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full">
                  {studentQueries.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "sent" ? (
            <>
              {showCompose ? (
                <>
                  {/* Compose card */}
                  <div
                    className={`bg-white p-6 rounded-xl shadow-md mb-8 transform transition-all duration-300 ease-out ${
                      composeVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => resetCompose()}
                      className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                      ← Back to Sent Messages
                    </button>
                    {/* Recipients */}
                    <label className="block text-sm font-medium text-gray-700 mb-2">Send to</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { key: "all", label: "All Users" },
                        { key: "batch", label: "Select Batch" },
                        { key: "user", label: "Select Student" },
                      ].map((opt) => (
                        <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setTarget(opt.key);
                        resetRecipients();
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        target === opt.key
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Batch multi-select */}
                {target === "batch" && (
                  <div className="relative mb-4" ref={batchBoxRef}>
                    <div
                      className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white cursor-text focus-within:ring-2 focus-within:ring-indigo-500"
                      onClick={() => setBatchDropdownOpen(true)}
                    >
                      {selectedBatches.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 text-xs font-medium"
                        >
                          {b}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBatch(b);
                            }}
                            className="hover:text-indigo-950"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={batchSearch}
                        onChange={(e) => {
                          setBatchSearch(e.target.value);
                          setBatchDropdownOpen(true);
                        }}
                        onFocus={() => setBatchDropdownOpen(true)}
                        placeholder={selectedBatches.length === 0 ? "Select batch(es)" : "Add another..."}
                        className="flex-1 min-w-[120px] outline-none text-sm py-0.5"
                      />
                    </div>
                    {batchDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                        {matchingBatchOptions.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-400">No matching batches.</p>
                        ) : (
                          matchingBatchOptions.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                toggleBatch(b.name);
                                setBatchSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              {b.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Student multi-select */}
                {target === "user" && (
                  <div className="relative mb-4" ref={userBoxRef}>
                    <div
                      className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white cursor-text focus-within:ring-2 focus-within:ring-indigo-500"
                      onClick={() => setUserDropdownOpen(true)}
                    >
                      {selectedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 text-xs font-medium"
                        >
                          {u.label}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUsers((prev) => prev.filter((s) => s.id !== u.id));
                            }}
                            className="hover:text-indigo-950"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <div className="relative flex-1 min-w-[140px]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-1 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => {
                            setUserSearch(e.target.value);
                            setUserDropdownOpen(true);
                          }}
                          onFocus={() => setUserDropdownOpen(true)}
                          placeholder={selectedUsers.length === 0 ? "Search student name/username" : "Add another..."}
                          className="w-full pl-6 outline-none text-sm py-0.5"
                        />
                      </div>
                    </div>
                    {userDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                        {matchingUserOptions.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-gray-400">No matching students.</p>
                        ) : (
                          matchingUserOptions.slice(0, 50).map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                toggleUser(u);
                                setUserSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              {u.name}{" "}
                              <span className="text-gray-400">({u.user_name})</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Heading - must be filled before the message box unlocks */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
                <input
                  type="text"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="Type a heading..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-indigo-200 focus:outline-none text-sm mb-4"
                />

                {/* Message text - locked until a heading has been entered */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    heading.trim() ? "Type your message..." : "Add a heading first..."
                  }
                  rows={4}
                  disabled={!heading.trim()}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-indigo-200 focus:outline-none text-sm mb-4 ${
                    !heading.trim() ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
                  }`}
                />

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
                </>
              ) : (
                <>
                  {/* Sent history */}
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <h3 className="text-lg font-semibold text-slate-800 px-6 pt-6 pb-4">Sent Messages</h3>
                    {sentMessages.length === 0 ? (
                      <p className="text-sm text-gray-500 px-6 pb-6">No messages sent yet.</p>
                    ) : (
                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                        {sentMessages.map((row) => (
                          <div key={row.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <UsersIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span className="text-xs font-semibold text-indigo-700">
                                {describeTarget(row)}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                                {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                              </span>
                            </div>
                            {row.heading && (
                              <p className="text-sm font-semibold text-slate-800 mb-1">{row.heading}</p>
                            )}
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{row.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            /* ---------------- STUDENT QUERIES TAB ---------------- */
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Student Queries</h3>
              {studentQueries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No student queries yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[32rem] overflow-y-auto">
                  {studentQueries.map((q) => (
                    <div
                      key={q.id}
                      className="border border-amber-200 bg-amber-50/40 rounded-xl p-5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {q.user_name || q.student_name || "Student"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {q.user_email || ""}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 ml-auto">
                          {q.created_at ? new Date(q.created_at).toLocaleString() : ""}
                        </span>
                      </div>

                      {q.subject && (
                        <p className="text-sm font-bold text-amber-800 mb-1">{q.subject}</p>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{q.message}</p>

                      {q.reply && (
                        <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Reply className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-700">Your Reply</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.reply}</p>
                        </div>
                      )}

                      {replyTo === q.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleReply(q.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleReply(q.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => { setReplyTo(null); setReplyText(""); }}
                            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        !q.reply && (
                          <button
                            onClick={() => { setReplyTo(q.id); setReplyText(""); }}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Reply size={14} />
                            Reply
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminMessages;