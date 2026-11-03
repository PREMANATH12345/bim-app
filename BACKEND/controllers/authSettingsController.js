import db from "../db.js";

let settingsTablePromise;
let trustedDevicesTablePromise;

const ensureSettingsTable = () => {
	if (!settingsTablePromise) {
		settingsTablePromise = new Promise((resolve, reject) => {
			db.query(
				`CREATE TABLE IF NOT EXISTS app_settings (
					setting_key VARCHAR(100) PRIMARY KEY,
					setting_value VARCHAR(255) NOT NULL
				)`,
				(error) => error ? reject(error) : resolve(),
			);
		}).catch((error) => {
			settingsTablePromise = null;
			throw error;
		});
	}
	return settingsTablePromise;
};

const ensureTrustedDevicesTable = () => {
	if (!trustedDevicesTablePromise) {
		trustedDevicesTablePromise = new Promise((resolve, reject) => {
			db.query(
				`CREATE TABLE IF NOT EXISTS trusted_face_devices (
					id INT AUTO_INCREMENT PRIMARY KEY,
					user_id INT NOT NULL,
					device_id VARCHAR(191) NOT NULL,
					token_hash CHAR(64) NOT NULL UNIQUE,
					device_name VARCHAR(255) NOT NULL,
						enabled TINYINT(1) NOT NULL DEFAULT 1,
					created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
					last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
					UNIQUE KEY unique_trusted_user (user_id)
				)`,
				(error) => {
					if (error) return reject(error);
						const ensureEnabledColumn = () => new Promise((columnResolve, columnReject) => {
							db.query("SHOW COLUMNS FROM trusted_face_devices LIKE 'enabled'", (columnError, columns) => {
								if (columnError) return columnReject(columnError);
								if (columns.length) return columnResolve();
								db.query("ALTER TABLE trusted_face_devices ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1", (alterError) => {
									if (alterError) return columnReject(alterError);
									columnResolve();
								});
							});
						});
						ensureEnabledColumn().then(() => {
							db.query(
								`DELETE older FROM trusted_face_devices older
								 INNER JOIN trusted_face_devices newer
								 ON older.user_id = newer.user_id AND older.id < newer.id`,
								(cleanupError) => {
									if (cleanupError) return reject(cleanupError);
									db.query("SHOW INDEX FROM trusted_face_devices WHERE Key_name = 'unique_trusted_user'", (indexError, indexes) => {
										if (indexError) return reject(indexError);
										if (indexes.length) return resolve();
										db.query("ALTER TABLE trusted_face_devices ADD UNIQUE KEY unique_trusted_user (user_id)", (alterError) => {
											if (alterError) return reject(alterError);
											resolve();
										});
									});
								},
							);
						}).catch(reject);
				},
			);
		}).catch((error) => {
			trustedDevicesTablePromise = null;
			throw error;
		});
	}
	return trustedDevicesTablePromise;
};

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
	db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
});

export const requireLoginMethod = (allowedMethods) => async (req, res, next) => {
	try {
		await ensureSettingsTable();
		db.query(
			"SELECT setting_value FROM app_settings WHERE setting_key = 'admin_login_method'",
			(error, rows) => {
				if (error) {
					console.error("Database Error (login method enforcement):", error);
					return res.status(500).json({ message: "Could not verify login method" });
				}
				const configuredMethod = rows[0]?.setting_value;
				const loginMethod = ["password", "face", "both"].includes(configuredMethod)
					? configuredMethod
					: "password";
				if (!allowedMethods.includes(loginMethod)) {
					return res.status(403).json({ message: "This login method is disabled by the administrator" });
				}
				next();
			},
		);
	} catch (error) {
		console.error("Database Error (login settings table):", error);
		return res.status(500).json({ message: "Could not verify login method" });
	}
};

export const getLoginMethod = async (req, res) => {
	try {
		await ensureSettingsTable();
		db.query(
			"SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('admin_login_method', 'admin_face_mode')",
			(error, rows) => {
				if (error) {
					console.error("Database Error (login method):", error);
					return res.status(500).json({ message: "Could not load login method" });
				}
				const settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
				const loginMethod = settings.admin_login_method;
				res.json({
					loginMethod: ["password", "face", "both"].includes(loginMethod) ? loginMethod : "password",
					faceMode: settings.admin_face_mode === "trusted-device" ? "trusted-device" : "every-time",
					configured: rows.some((row) => row.setting_key === "admin_login_method"),
				});
			},
		);
	} catch (error) {
		console.error("Database Error (login settings table):", error);
		res.status(500).json({ message: "Could not load login method" });
	}
};

export const saveLoginMethod = async (req, res) => {
	if (req.user?.role !== "admin") {
		return res.status(403).json({ message: "Admin access required" });
	}

	const { loginMethod, faceMode = "every-time" } = req.body;
	if (!["password", "face", "both"].includes(loginMethod)) {
		return res.status(400).json({ message: "Invalid login method" });
	}
	if (!["every-time", "trusted-device"].includes(faceMode)) {
		return res.status(400).json({ message: "Invalid face sign-in mode" });
	}

	try {
		await ensureSettingsTable();
		await queryAsync(
			`INSERT INTO app_settings (setting_key, setting_value)
			 VALUES ('admin_login_method', ?)
			 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
			[loginMethod],
		);
		await queryAsync(
			`INSERT INTO app_settings (setting_key, setting_value)
			 VALUES ('admin_face_mode', ?)
			 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
			[faceMode],
		);
		if (faceMode === "every-time") {
			await ensureTrustedDevicesTable();
			await queryAsync("DELETE FROM trusted_face_devices");
		}
		res.json({ message: "Login settings saved", loginMethod, faceMode });
	} catch (error) {
		console.error("Database Error (save login settings):", error);
		res.status(500).json({ message: "Could not save login settings" });
	}
};

export const requireTrustedFaceMode = async (req, res, next) => {
	try {
		await ensureSettingsTable();
		db.query(
			"SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('admin_login_method', 'admin_face_mode')",
			(error, rows) => {
				if (error) {
					console.error("Database Error (trusted face mode):", error);
					return res.status(500).json({ message: "Could not verify trusted-device mode" });
				}
				const settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
				if (settings.admin_face_mode !== "trusted-device" || !["face", "both"].includes(settings.admin_login_method)) {
					return res.status(403).json({ message: "This browser must verify its face at sign-in" });
				}
				next();
			},
		);
	} catch (error) {
		console.error("Database Error (trusted face mode):", error);
		return res.status(500).json({ message: "Could not verify trusted-device mode" });
	}
};

export const getTrustedFaceDevices = async (req, res) => {
	try {
		await ensureTrustedDevicesTable();
		db.query(
			"SELECT id, device_id, device_name, enabled, created_at, last_used_at FROM trusted_face_devices WHERE user_id = ? ORDER BY last_used_at DESC",
			[req.user.id],
			(error, rows) => {
				if (error) return res.status(500).json({ message: "Could not load trusted devices" });
				return res.json(rows);
			},
		);
	} catch (error) {
		console.error("Database Error (trusted devices):", error);
		return res.status(500).json({ message: "Could not load trusted devices" });
	}
};

export const removeTrustedFaceDevice = async (req, res) => {
	try {
		await ensureTrustedDevicesTable();
		db.query(
			"DELETE FROM trusted_face_devices WHERE id = ? AND user_id = ?",
			[req.params.id, req.user.id],
			(error, result) => {
				if (error) return res.status(500).json({ message: "Could not unlink trusted device" });
				if (!result.affectedRows) return res.status(404).json({ message: "Trusted device not found" });
				return res.json({ message: "Trusted device unlinked" });
			},
		);
	} catch (error) {
		console.error("Database Error (unlink trusted device):", error);
		return res.status(500).json({ message: "Could not unlink trusted device" });
	}
};

export const setTrustedFaceDeviceEnabled = async (req, res) => {
	if (typeof req.body?.enabled !== "boolean") {
		return res.status(400).json({ message: "A valid enabled value is required" });
	}

	try {
		await ensureTrustedDevicesTable();
		const result = await queryAsync(
			"UPDATE trusted_face_devices SET enabled = ? WHERE id = ? AND user_id = ?",
			[req.body.enabled ? 1 : 0, req.params.id, req.user.id],
		);
		if (!result.affectedRows) return res.status(404).json({ message: "Trusted device not found" });
		return res.json({ message: "Trusted-device sign-in updated", enabled: req.body.enabled });
	} catch (error) {
		console.error("Database Error (trusted-device sign-in):", error);
		return res.status(500).json({ message: "Could not update trusted-device sign-in" });
	}
};

export const ensureTrustedFaceDevicesTable = ensureTrustedDevicesTable;