import jwt from "jsonwebtoken";
import db from "../db.js";
import moment from "moment-timezone"; 
import { createHash, randomBytes } from "crypto";
import { ensureTrustedFaceDevicesTable } from "./authSettingsController.js";

const FACE_MATCH_THRESHOLD = 0.6;
const FACE_MATCH_AMBIGUITY_MARGIN = 0.08;





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
          .status(404)
          .json({ message: "Your name is not registered. Check the name you entered or contact the administrator." });
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

      let registeredDevices = user.device_id 
        ? String(user.device_id).split(",").map(d => d.trim()).filter(Boolean) 
        : [];

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

export const faceLoginUser = (req, res) => {
  const { face_descriptor, device_id } = req.body;
  const isValidDescriptor = Array.isArray(face_descriptor)
    && face_descriptor.length === 128
    && face_descriptor.every((value) => Number.isFinite(value));

  if (!isValidDescriptor) {
    return res.status(400).json({ message: "Invalid face recognition data" });
  }

  db.query(
    "SELECT id, name, user_name, role, batch, active, device_id, allowed_device_count, face_descriptor FROM users WHERE Face_status = 'Enrolled' AND face_descriptor IS NOT NULL",
    (err, users) => {
      if (err) {
        console.error("Database Error (face login):", err);
        return res.status(500).json({ message: "Could not verify face recognition" });
      }

      const matches = users.flatMap((user) => {
        if (user.active === "no") return [];

        try {
          const enrolledDescriptor = Array.isArray(user.face_descriptor)
            ? user.face_descriptor
            : JSON.parse(user.face_descriptor);
          if (!Array.isArray(enrolledDescriptor) || enrolledDescriptor.length !== 128) return [];

          const distance = Math.sqrt(face_descriptor.reduce(
            (sum, value, index) => sum + (value - enrolledDescriptor[index]) ** 2,
            0,
          ));
          return distance < FACE_MATCH_THRESHOLD ? [{ user, distance }] : [];
        } catch {
          return [];
        }
      }).sort((first, second) => first.distance - second.distance);

      if (!matches.length) {
        const hasEnrolledFaces = users.length > 0;
        return res.status(401).json({
          message: hasEnrolledFaces
            ? "Face not recognized. Try again or contact the administrator."
            : "Your face is not registered for face recognition. Contact the administrator to enroll it.",
        });
      }
      const bestMatch = matches[0];
      const secondBestMatch = matches[1];
      if (
        secondBestMatch &&
        secondBestMatch.distance - bestMatch.distance < FACE_MATCH_AMBIGUITY_MARGIN
      ) {
        return res.status(409).json({
          message: "This face matches more than one account. Ask the administrator to check for duplicate face enrollments.",
        });
      }

      const { user } = bestMatch;
      const userAgent = req.headers["user-agent"] || "";
      const isAppleDevice = /iPhone|iPad|iPod|Macintosh/i.test(userAgent);
      const registeredDevices = user.device_id
        ? String(user.device_id).split(",").map((id) => id.trim()).filter(Boolean)
        : [];
      const isNewStudentDevice = user.role === "student"
        && !isAppleDevice
        && Boolean(device_id)
        && !registeredDevices.includes(device_id);

      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, batch: user.batch },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const loginTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

      const completeLogin = async () => {
        try {
          const settings = await new Promise((resolve, reject) => {
            db.query(
              "SELECT setting_value FROM app_settings WHERE setting_key = 'admin_face_mode'",
              (settingsError, rows) => settingsError ? reject(settingsError) : resolve(rows),
            );
          });
          let faceTrustToken = null;
          if (settings[0]?.setting_value === "trusted-device" && device_id) {
            await ensureTrustedFaceDevicesTable();
            const linkedDevices = await new Promise((resolve, reject) => {
              db.query(
                "SELECT user_id, device_id FROM trusted_face_devices WHERE user_id = ? OR device_id = ?",
                [user.id, device_id],
                (lookupError, rows) => lookupError ? reject(lookupError) : resolve(rows),
              );
            });
            // A face match should still sign in from another browser profile,
            // but only an unclaimed device or this account's linked device may be trusted.
            const deviceOwnedByAnotherUser = linkedDevices.some(
              (linkedDevice) => linkedDevice.device_id === device_id && linkedDevice.user_id !== user.id,
            );
            const accountDevice = linkedDevices.find((linkedDevice) => linkedDevice.user_id === user.id);
            if (!deviceOwnedByAnotherUser && (!accountDevice || accountDevice.device_id === device_id)) {
              faceTrustToken = randomBytes(32).toString("hex");
              const tokenHash = createHash("sha256").update(faceTrustToken).digest("hex");
              const deviceName = String(req.body.device_name || req.headers["user-agent"] || "Trusted browser").slice(0, 255);
              await new Promise((resolve, reject) => {
                const sql = accountDevice
                  ? `UPDATE trusted_face_devices
                     SET token_hash = ?, device_name = ?, last_used_at = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND device_id = ?`
                  : `INSERT INTO trusted_face_devices (token_hash, device_name, user_id, device_id)
                     VALUES (?, ?, ?, ?)`;
                db.query(
                  sql,
                  [tokenHash, deviceName, user.id, device_id],
                  (saveError) => saveError ? reject(saveError) : resolve(),
                );
              });
            }
          }
          db.query(
            `INSERT INTO user_logs (user_name, user_id, role, batch, login_time)
             VALUES (?, ?, ?, ?, ?)`,
            [user.user_name, user.id, user.role, user.batch, loginTime],
            (logErr) => {
              if (logErr) console.error("Failed to insert face login log:", logErr);
            },
          );
          return res.json({
            token,
            role: user.role,
            name: user.name,
            batch: user.batch,
            ...(faceTrustToken ? { faceTrustToken } : {}),
          });
        } catch (saveError) {
          console.error("Failed to save trusted face device:", saveError);
          if (saveError.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
              message: "Your account is already linked on another device. Unlink that device before linking this one.",
            });
          }
          return res.status(500).json({ message: "Face sign-in succeeded, but this browser could not be trusted. Try again." });
        }
      };

      if (isNewStudentDevice) {
        registeredDevices.push(device_id);
        db.query(
          "UPDATE users SET device_id = ? WHERE id = ?",
          [registeredDevices.join(","), user.id],
          (updateErr) => {
            if (updateErr) {
              console.error("Failed to update device ID:", updateErr);
              return res.status(500).json({ message: "Failed to update device ID" });
            }
            completeLogin();
          },
        );
      } else {
        completeLogin();
      }
    },
  );
};

export const trustedFaceLogin = async (req, res) => {
  const { faceTrustToken, device_id } = req.body;
  if (typeof faceTrustToken !== "string" || faceTrustToken.length < 32) {
    return res.status(401).json({ message: "This browser is not linked. Verify your face to sign in." });
  }
  if (!device_id) {
    return res.status(400).json({ message: "Browser identity is missing. Verify your face to sign in." });
  }

  try {
    await ensureTrustedFaceDevicesTable();
    const tokenHash = createHash("sha256").update(faceTrustToken).digest("hex");
    db.query(
      `SELECT u.id, u.name, u.user_name, u.role, u.batch, u.active, d.id AS trusted_device_id, d.enabled AS trusted_device_enabled
       FROM trusted_face_devices d
       JOIN users u ON u.id = d.user_id
      WHERE d.token_hash = ? AND d.device_id = ? LIMIT 1`,
          [tokenHash, device_id],
      (error, rows) => {
        if (error) {
          console.error("Database Error (trusted face login):", error);
          return res.status(500).json({ message: "Could not verify this trusted browser" });
        }
        const user = rows[0];
        if (!user || user.active === "no" || Number(user.trusted_device_enabled) === 0) {
          return res.status(401).json({ message: "This browser is no longer linked. Verify your face to sign in." });
        }

        const token = jwt.sign(
          { id: user.id, role: user.role, name: user.name, batch: user.batch },
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
        );
        const loginTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
        db.query(
          "UPDATE trusted_face_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
          [user.trusted_device_id],
        );
        db.query(
          `INSERT INTO user_logs (user_name, user_id, role, batch, login_time)
           VALUES (?, ?, ?, ?, ?)`,
          [user.user_name, user.id, user.role, user.batch, loginTime],
          (logError) => {
            if (logError) console.error("Failed to log trusted-device sign-in:", logError);
          },
        );
        return res.json({ token, role: user.role, name: user.name, batch: user.batch });
      },
    );
  } catch (error) {
    console.error("Database Error (trusted face login):", error);
    return res.status(500).json({ message: "Could not verify this trusted browser" });
  }
};

export const unlinkCurrentTrustedFaceDevice = async (req, res) => {
  const { faceTrustToken } = req.body;
  if (typeof faceTrustToken !== "string" || faceTrustToken.length < 32) {
    return res.status(400).json({ message: "This browser has no trusted-device credential" });
  }

  try {
    await ensureTrustedFaceDevicesTable();
    const tokenHash = createHash("sha256").update(faceTrustToken).digest("hex");
    db.query(
      "DELETE FROM trusted_face_devices WHERE token_hash = ?",
      [tokenHash],
      (error) => {
        if (error) {
          console.error("Database Error (unlink current trusted device):", error);
          return res.status(500).json({ message: "Could not unlink this browser" });
        }
        return res.json({ message: "This browser is no longer trusted" });
      },
    );
  } catch (error) {
    console.error("Database Error (unlink current trusted device):", error);
    return res.status(500).json({ message: "Could not unlink this browser" });
  }
};

export const linkCurrentTrustedFaceDevice = async (req, res) => {
  const { device_id, device_name } = req.body;
  if (typeof device_id !== "string" || !device_id.trim() || device_id.length > 191) {
    return res.status(400).json({ message: "A valid browser identity is required" });
  }

  try {
    await ensureTrustedFaceDevicesTable();
    db.query(
        "SELECT user_id, device_id FROM trusted_face_devices WHERE user_id = ? OR device_id = ?",
        [req.user.id, device_id],
      (lookupError, rows) => {
        if (lookupError) {
          console.error("Database Error (lookup trusted device):", lookupError);
          return res.status(500).json({ message: "Could not check linked devices" });
        }
          if (rows.some((row) => row.device_id === device_id && row.user_id !== req.user.id)) {
            return res.status(409).json({
              message: "This device is already linked to another account. Unlink it from that account before linking it here.",
            });
          }
          const accountDevice = rows.find((row) => row.user_id === req.user.id);
          if (accountDevice && accountDevice.device_id !== device_id) {
          return res.status(409).json({
            message: "Your account is already linked on another device. Unlink that device before linking this one.",
          });
        }

        const faceTrustToken = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(faceTrustToken).digest("hex");
        const normalizedName = String(device_name || req.headers["user-agent"] || "This browser").slice(0, 255);
        const sql = accountDevice
          ? `UPDATE trusted_face_devices
             SET token_hash = ?, device_name = ?, last_used_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND device_id = ?`
          : `INSERT INTO trusted_face_devices (token_hash, device_name, user_id, device_id)
             VALUES (?, ?, ?, ?)`;
        db.query(sql, [tokenHash, normalizedName, req.user.id, device_id], (saveError) => {
          if (saveError) {
            console.error("Database Error (link trusted device):", saveError);
            if (saveError.code === "ER_DUP_ENTRY") {
              return res.status(409).json({
                message: "Your account is already linked on another device. Unlink that device before linking this one.",
              });
            }
            return res.status(500).json({ message: "Could not link this device" });
          }
          return res.json({
            message: "This device is now linked to your account.",
            faceTrustToken,
          });
        });
      },
    );
  } catch (error) {
    console.error("Database Error (link trusted device):", error);
    return res.status(500).json({ message: "Could not link this device" });
  }
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
