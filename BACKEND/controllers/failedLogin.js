import db from "../db.js";

export const getFailedLogins = (req, res) => {
  db.query(
    "SELECT id, user_id, name, role, attempted_at FROM failed_logins ORDER BY attempted_at DESC LIMIT 100",
    (err, results) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ message: "Database Error" });
      }
      res.json(results);
    }
  );
};
