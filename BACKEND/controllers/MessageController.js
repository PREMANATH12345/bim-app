// controllers/messageController.js
import db1 from "../db1.js";

// Normalize a raw batch value (plain string, comma list, JSON-ish array
// string, or real array) into a clean, deduped, lowercased array. Mirrors
// the same normalization already used for video batch matching, so a
// student matches a batch-targeted message regardless of minor formatting
// differences between how their batch and the message's target batch are
// stored.
const normalizeBatchValues = (value) => {
  let values = value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      values = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      values = value.split(",");
    }
  }
  if (!Array.isArray(values)) values = [values];
  return [
    ...new Set(
      values
        .map((v) => String(v ?? "").replace(/[\[\]"']/g, "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
};

// ✅ Admin: send a message to all users, one or more batches, or specific student(s)
export const sendMessage = async (req, res) => {
  try {
    const { heading, message, target, batches, userIds } = req.body;
    const createdBy = req.user?.name || "Admin";

    if (!heading || !heading.trim()) {
      return res.status(400).json({ success: false, error: "Heading is required" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Message text is required" });
    }

    const rows = [];

    if (target === "all") {
      rows.push(["all", null]);
    } else if (target === "batch") {
      const cleanBatches = Array.isArray(batches) ? batches.filter(Boolean) : [];
      if (cleanBatches.length === 0) {
        return res.status(400).json({ success: false, error: "Select at least one batch" });
      }
      cleanBatches.forEach((b) => rows.push(["batch", b]));
    } else if (target === "user") {
      const cleanUsers = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
      if (cleanUsers.length === 0) {
        return res.status(400).json({ success: false, error: "Select at least one student" });
      }
      cleanUsers.forEach((id) => rows.push(["user", String(id)]));
    } else {
      return res.status(400).json({ success: false, error: "Invalid target" });
    }

    for (const [targetType, targetValue] of rows) {
      await db1.query(
        "INSERT INTO messages (heading, message, target_type, target_value, created_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [heading.trim(), message.trim(), targetType, targetValue, createdBy]
      );
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
};

// ✅ Admin: list every message that's been sent (history), newest first
export const getSentMessages = async (req, res) => {
  try {
    const [rows] = await db1.query(
      "SELECT id, heading, message, target_type, target_value, created_by, created_at FROM messages ORDER BY id DESC"
    );
    res.json({ success: true, messages: rows });
  } catch (err) {
    console.error("Error fetching sent messages:", err);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

// ✅ Student: submit a new query to the admin
export const submitQuery = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const { id, name, batch } = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    const batchLabel = Array.isArray(batch)
      ? batch.join(", ")
      : normalizeBatchValues(batch).join(", ");

    await db1.query(
      "INSERT INTO queries (student_id, student_name, batch, subject, message, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [id, name || "Student", batchLabel || null, (subject || "").trim() || null, message.trim()]
    );

    res.json({ success: true, message: "Query sent successfully" });
  } catch (err) {
    console.error("Error submitting query:", err);
    res.status(500).json({ success: false, error: "Failed to send query" });
  }
};

// ✅ Student: get my own queries (including any admin reply), newest first
export const getMyQueries = async (req, res) => {
  try {
    const { id } = req.user;
    const [rows] = await db1.query(
      "SELECT id, subject, message, reply, replied_at, created_at FROM queries WHERE student_id = ? ORDER BY id DESC",
      [id]
    );
    res.json({ success: true, queries: rows });
  } catch (err) {
    console.error("Error fetching my queries:", err);
    res.status(500).json({ success: false, error: "Failed to fetch queries" });
  }
};

// ✅ Admin: list every student query, newest first
export const getAllQueries = async (req, res) => {
  try {
    const [rows] = await db1.query(
      "SELECT id, student_id, student_name, batch, subject, message, reply, replied_at, created_at FROM queries ORDER BY id DESC"
    );
    res.json({ success: true, queries: rows });
  } catch (err) {
    console.error("Error fetching queries:", err);
    res.status(500).json({ success: false, error: "Failed to fetch queries" });
  }
};

// ✅ Admin: reply to a specific student query
export const replyToQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, error: "Reply text is required" });
    }

    const [result] = await db1.query(
      "UPDATE queries SET reply = ?, replied_at = NOW() WHERE id = ?",
      [reply.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Query not found" });
    }

    res.json({ success: true, message: "Reply sent" });
  } catch (err) {
    console.error("Error replying to query:", err);
    res.status(500).json({ success: false, error: "Failed to send reply" });
  }
};

// ✅ Any logged-in user (typically a student): get the messages addressed to
// them - broadcast to everyone, sent to a batch they're in, or sent to them
// directly by user id.
export const getMyMessages = async (req, res) => {
  try {
    const { id, batch } = req.user;
    const myBatches = normalizeBatchValues(batch);

    const [directRows] = await db1.query(
      "SELECT id, heading, message, target_type, target_value, created_by, created_at FROM messages WHERE target_type = 'all' OR (target_type = 'user' AND target_value = ?)",
      [String(id)]
    );

    const [batchRows] = await db1.query(
      "SELECT id, heading, message, target_type, target_value, created_by, created_at FROM messages WHERE target_type = 'batch'"
    );

    const matchingBatchRows = batchRows.filter((row) =>
      normalizeBatchValues(row.target_value).some((b) => myBatches.includes(b))
    );

    const combined = [...directRows, ...matchingBatchRows].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ success: true, messages: combined });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};