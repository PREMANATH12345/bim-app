import db from "../db.js";
import jwt from "jsonwebtoken"; // Ensure this is at the top

// ---------------------------------------------------------------------
// Shared helper — normalizes batch / accessVideo / fullAccessBatches
// fields no matter how they're stored (JSON string, plain string,
// comma list, or already an array). Used by EVERY function below so
// the admin panel and the student dashboard always see the same shape.
// ---------------------------------------------------------------------
const safeParse = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;

  if (typeof field === "string") {
    const trimmed = field.trim();
    // JSON array string like '["1","2"]'
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        return [trimmed];
      }
    }
    // comma list like "1,2,3"
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    // single value string like "1"
    return trimmed ? [trimmed] : [];
  }

  return [String(field)];
};

// Create a new user
export const createUser = (req, res) => {
  const {
    name,
    user_name,
    password,
    batch,
    role,
    accessVideo,
    fullAccessBatches,
    allowed_device_count
  } = req.body;

  console.log("accessVideo:", accessVideo);
  console.log("fullAccessBatches:", fullAccessBatches);

  if (!name || !user_name || !password || !role) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  // Convert accessVideo and fullAccessBatches arrays to JSON strings
  const accessVideoValue = JSON.stringify(accessVideo || []);
  const fullAccessBatchesValue = JSON.stringify(fullAccessBatches || []);

  db.query(
    "SELECT * FROM users WHERE user_name = ?",
    [user_name],
    (err, results) => {
      if (err) {
        console.error("Database Error (SELECT):", err);
        return res.status(500).json({
          message: "Database Error"
        });
      }

      if (results.length > 0) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      const sql = `
        INSERT INTO users
        (
          name,
          user_name,
          password,
          batch,
          role,
          accessVideo,
          fullAccessBatches,
          active,
          allowed_device_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'yes', ?)
      `;

      db.query(
        sql,
        [
          name,
          user_name,
          password,
          batch,
          role,
          accessVideoValue,
          fullAccessBatchesValue,
          allowed_device_count
        ],
        (err, result) => {
          if (err) {
            console.error("Database Error (INSERT):", err);
            return res.status(500).json({
              message: "Error creating user"
            });
          }

          console.log("User created successfully:", user_name);

          res.json({
            message: "User created successfully"
          });
        }
      );
    }
  );
};

// Get all users (Only Admin)
export const getUsers = (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  db.query(
    "SELECT id, name, user_name, password, batch, role, active, device_id, accessVideo, fullAccessBatches, allowed_device_count FROM users",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database Error" });

      const parsedResults = results.map((user) => ({
        ...user,
        batch: safeParse(user.batch),
        accessVideo: safeParse(user.accessVideo),
        fullAccessBatches: safeParse(user.fullAccessBatches),
      }));

      res.json(parsedResults);
    }
  );
};

// ---------------------------------------------------------------------
// NEW: Get the LOGGED-IN user's own access info (batch, accessVideo,
// fullAccessBatches), safely parsed. This is what fixes the "All Videos
// (Auto-new)" not showing new videos" bug — the student dashboard needs
// this data to arrive as real arrays, not raw/undefined JSON strings, or
// isBatchInFullAccess() on the frontend silently falls back to treating
// the batch as NOT full-access.
//
// Mount this at a route like GET /users/me/access (or fold its query
// into your existing /videos/videos controller — either works, as long
// as fullAccessBatches goes through safeParse before being sent).
// ---------------------------------------------------------------------
export const getMyAccess = (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT id, name, user_name, batch, role, accessVideo, fullAccessBatches FROM users WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Database Error (SELECT getMyAccess):", err);
        return res.status(500).json({ message: "Database Error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = results[0];

      res.json({
        id: user.id,
        name: user.name,
        user_name: user.user_name,
        role: user.role,
        batch: safeParse(user.batch),
        accessVideo: safeParse(user.accessVideo),
        fullAccessBatches: safeParse(user.fullAccessBatches),
      });
    }
  );
};

// Other functions (Deactivate, Activate, Delete User)
export const toggleUserStatus = (req, res) => {
  const { id } = req.params;
  const { active } = req.body; // Expecting "yes" or "no"

  db.query(
    "UPDATE users SET active = ? WHERE id = ?",
    [active, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });

      res.json({ message: `User status updated to ${active}` });
    }
  );
};

export const deleteUser = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error deleting user" });
    res.json({ message: "User deleted successfully" });
  });
};

export const editUser = (req, res) => {
  const { id } = req.params;
  const { name, user_name, password, batch, role, active, device_id, accessVideo, fullAccessBatches, allowed_device_count } = req.body;

  // Debug logs
  console.log("Incoming batch:", batch);
  console.log("Incoming accessVideo:", accessVideo);
  console.log("Incoming fullAccessBatches:", fullAccessBatches);

  if (!name || !user_name || !role) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  // Ensure consistent storage as JSON
  const formattedBatch = batch ? (typeof batch === "string" ? batch : JSON.stringify(batch)) : "[]";
  const formattedAccessVideo = accessVideo ? JSON.stringify(accessVideo) : "[]";
  const formattedFullAccess = fullAccessBatches ? JSON.stringify(fullAccessBatches) : "[]";

  const sql = `
    UPDATE users 
    SET name = ?, user_name = ?, password = ?, batch = ?, role = ?, active = ?, device_id = ?, accessVideo = ?, fullAccessBatches = ?, allowed_device_count = ? 
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, user_name, password, formattedBatch, role, active, device_id, formattedAccessVideo, formattedFullAccess, allowed_device_count, id],
    (err, result) => {
      if (err) {
        console.error("SQL Error:", err);
        return res.status(500).json({ message: "Database Error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User updated successfully" });
    }
  );
};