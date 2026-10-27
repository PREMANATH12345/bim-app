import jwt from "jsonwebtoken";
import db from "../db.js";
import moment from "moment-timezone"; 





export const loginUser = (req, res) => {
  const { user_name, password, device_id } = req.body;
  console.log("Login attempt:", { user_name, device_id }); // Debug log

  // 🕵️ Detect device type from User-Agent
  const userAgent = req.headers["user-agent"] || "";

  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isMac = /Macintosh/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  const isAppleDevice = isIOS || isMac;

  // 🧪 Debug (optional)
  console.log("User-Agent:", userAgent);
  console.log("Is Apple Device:", isAppleDevice);

  // ❗ Basic validation
  if (!user_name || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  // ❗ Device ID required ONLY for non-Apple devices
  if (!isAppleDevice && !device_id) {
    return res
      .status(400)
      .json({ message: "Device ID is required" });
  }
console.log("Device ID:", user_name); // Debug log
  // 🔍 Find user
  db.query(
    "SELECT * FROM users WHERE user_name = ?",
    [user_name],
    (err, results) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ message: "Database Error" });
      }
      console.log("Database query results:", results); // Debug log

      if (results.length === 0) {
        console.error("User not found:", user_name);
        return res
          .status(400)
          .json({ message: "Invalid username or password" });
      }

      const user = results[0];

      console.log("User found:", { id: user.id, role: user.role, active: user.active, device_id: user.device_id }); // Debug log

      // 🔑 Password check (plain-text as per your setup)
      if (user.password !== password) {
        return res
          .status(400)
          .json({ message: "Invalid username or password" });
      }

      // 🚫 Active check
      if (user.active === "no") {
        return res
          .status(403)
          .json({ message: "Your account is deactivated" });
      }

      // ⚙️ Multi-device limit setup
      const allowedCount = user.allowed_device_count || 1;
      let registeredDevices = user.device_id 
        ? String(user.device_id).split(",").map(d => d.trim()).filter(Boolean) 
        : [];

      // 🔐 Device restriction (Students + Non-Apple only)
      if (user.role === "student" && !isAppleDevice) {
        if (!registeredDevices.includes(device_id)) {
          // Device is not registered yet; check if limit reached
          if (registeredDevices.length >= allowedCount) {
            db.query(
              "INSERT INTO failed_logins (user_id, name, role) VALUES (?, ?, ?)",
              [user.id, user.name, user.role],
              () => {}
            );

            return res.status(403).json({
              message: `You have reached the maximum allowed devices (${allowedCount}) for your account. Please logout from an existing device or contact the administrator.`,
            });
          }
          // Otherwise, allow through and register below
        }
      }

      // 🔐 Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          name: user.name,
          batch: user.batch,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const loginTime = moment()
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss");

      // 📝 Insert login log helper
      const insertUserLog = () => {
        db.query(
          `INSERT INTO user_logs (user_name, user_id, role, batch, login_time)
           VALUES (?, ?, ?, ?, ?)`,
          [user.user_name, user.id, user.role, user.batch, loginTime],
          (logErr) => {
            if (logErr) {
              console.error("Failed to insert user log:", logErr);
            }
          }
        );
      };

      // 📱 Save device_id if it's a new device for student (non-Apple)
      if (user.role === "student" && !isAppleDevice && !registeredDevices.includes(device_id)) {
        registeredDevices.push(device_id);
        const updatedDeviceIds = registeredDevices.join(",");

        db.query(
          "UPDATE users SET device_id = ? WHERE id = ?",
          [updatedDeviceIds, user.id],
          (updateErr) => {
            if (updateErr) {
              console.error("Failed to update device ID:", updateErr);
              return res
                .status(500)
                .json({ message: "Failed to update device ID" });
            }

            insertUserLog();

            return res.json({
              token,
              role: user.role,
              name: user.name,
              batch: user.batch,
            });
          }
        );
      } else {
        insertUserLog();

        return res.json({
          token,
          role: user.role,
          name: user.name,
          batch: user.batch,
        });
      }
    }
  );
};

export const getUserLogs = (req, res) => {
  db.query(
    "SELECT * FROM user_logs ORDER BY id DESC LIMIT 100",
    (err, results) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ message: "Database Error" });
      }
      res.json(results);
    }
  );
};
