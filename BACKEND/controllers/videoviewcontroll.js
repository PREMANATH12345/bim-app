import db from "../db.js";
import db1 from "../db1.js";

// ============================================================
// POST /api/videos/:videoId/view/start
// Called the moment the user presses play.
// Creates a new row and works out if it's their 1st / 2nd / nth view.
// ============================================================
export const startView = (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?.id || req.body.user_id; // adjust to however your auth middleware attaches the user
  const deviceType = req.body.device_type || "unknown";

  if (!userId) {
    return res.status(400).json({ message: "User not identified" });
  }

  const countSql = `
    SELECT COALESCE(MAX(view_number), 0) AS lastViewNumber
    FROM video_views
    WHERE user_id = ? AND video_id = ?
  `;

  db.query(countSql, [userId, videoId], (err, results) => {
    if (err) {
      console.error("startView count error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    const nextViewNumber = (results[0]?.lastViewNumber || 0) + 1;

    const insertSql = `
      INSERT INTO video_views (user_id, video_id, view_number, device_type, started_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    db.query(insertSql, [userId, videoId, nextViewNumber, deviceType], (err2, result) => {
      if (err2) {
        console.error("startView insert error:", err2);
        return res.status(500).json({ message: "Server error" });
      }

      res.status(201).json({
        view_id: result.insertId,
        view_number: nextViewNumber,
      });
    });
  });
};

// ============================================================
// PUT /api/videos/view/:viewId
// Called periodically (every 10-15s) and on pause/unload (via sendBeacon)
// to update how long the user has actually watched.
// ============================================================
export const updateView = (req, res) => {
  const { viewId } = req.params;
  const { watch_duration_seconds } = req.body;

  if (watch_duration_seconds === undefined) {
    return res.status(400).json({ message: "watch_duration_seconds is required" });
  }

  const sql = `
    UPDATE video_views
    SET watch_duration_seconds = ?, ended_at = NOW()
    WHERE id = ?
  `;

  db.query(sql, [watch_duration_seconds, viewId], (err) => {
    if (err) {
      console.error("updateView error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ message: "View updated" });
  });
};

// POST /videos/track-view
// Body: { userId, videoId, viewNumber, watchDurationSeconds, deviceType, startedAt, endedAt }
export const trackView = (req, res) => {
  const {
    userId,
    videoId,
    viewNumber,
    watchDurationSeconds,
    deviceType,
    startedAt,
    endedAt,
  } = req.body;

  if (!userId || !videoId) {
    return res.status(400).json({ message: "userId and videoId are required" });
  }

  const sql = `
    INSERT INTO video_views
      (user_id, video_id, view_number, watch_duration_seconds, device_type, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    userId,
    videoId,
    viewNumber || 1,
    watchDurationSeconds ?? null,
    deviceType || "unknown",
    startedAt ? new Date(startedAt) : new Date(),
    endedAt ? new Date(endedAt) : null,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("trackView insert error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(201).json({ success: true });
  });
};

// GET /videos/track-view/count?videoId=X&userId=Y
export const trackViewCount = (req, res) => {
  const videoId = req.query.videoId;
  const userId = req.query.userId;

  if (!videoId || !userId) {
    return res.status(400).json({ message: "videoId and userId are required" });
  }

  const sql = `SELECT COUNT(*) AS count FROM video_views WHERE video_id = ? AND user_id = ?`;
  db.query(sql, [videoId, userId], (err, rows) => {
    if (err) {
      console.error("trackViewCount error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    const count = rows[0]?.count ? Number(rows[0].count) : 0;
    res.status(200).json({ count });
  });
};

// ============================================================
// GET /api/videos/analytics-video-list
// Lightweight list (id + title only) to populate the admin
// analytics dropdown. Supports optional ?search=<id|title>.
// ============================================================
export const getVideoListForAnalytics = (req, res) => {
  const search = req.query.search ? req.query.search.trim() : "";
  let sql = `SELECT id, title FROM videos`;
  const params = [];

  if (search) {
    sql += ` WHERE CAST(id AS CHAR) LIKE ? OR title LIKE ?`;
    const likeSearch = `%${search}%`;
    params.push(likeSearch, likeSearch);
  }

  sql += ` ORDER BY title ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("getVideoListForAnalytics error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ videos: rows });
  });
};

// GET /videos/list
// Returns all videos as [{ id, title }, ...]
export const listVideos = (req, res) => {
  const { batchId, batchIds, search } = req.query;

  // videos.batch stores the batch's NAME (free-text, e.g. "3A/2025"), not a numeric id -
  // same as getBatchVideosAnalytics below. The frontend sends batch NAMES via ?batchIds=.
  let batchNames = [];
  if (batchIds) {
    batchNames = String(batchIds).split(",").map((s) => s.trim()).filter(Boolean);
  } else if (batchId) {
    batchNames = [batchId];
  }

  let sql = `SELECT id, title, batch AS batch_id FROM videos WHERE 1=1`;
  const params = [];

  if (batchNames.length > 0) {
    sql += ` AND batch IN (?)`;
    params.push(batchNames);
  }

  if (search) {
    sql += ` AND title LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  sql += ` ORDER BY title ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("listVideos error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ videos: rows });
  });
};

// ============================================================
// GET /api/admin/videos/:videoId/analytics
// Used by the admin dashboard: summary cards + per-user view history.
// Supports optional ?userSearch=<id|name>.
// ============================================================
export const getVideoAnalytics = (req, res) => {
  const { videoId } = req.params;
  console.log('getVideoAnalytics called with videoId:', videoId, 'type:', typeof videoId);
  const userSearch = req.query.userSearch ? req.query.userSearch.trim() : "";
  let searchClause = "";
  const searchParams = [];

  if (userSearch) {
    searchClause = ` AND (CAST(u.id AS CHAR) LIKE ? OR u.name LIKE ?)`;
    const likeSearch = `%${userSearch}%`;
    searchParams.push(likeSearch, likeSearch);
  }

  const summarySql = `
    SELECT
      COUNT(*) AS totalViews,
      COUNT(DISTINCT vv.user_id) AS uniqueViewers,
      ROUND(AVG(COALESCE(vv.watch_duration_seconds, 0))) AS avgWatchSeconds
    FROM video_views vv
    JOIN users u ON u.id = vv.user_id
    WHERE vv.video_id = ?${searchClause}
  `;
  console.log('SUMMARY SQL:', summarySql);
  console.log('SUMMARY PARAMS:', [videoId, ...searchParams]);

  const repeatViewersSql = `
    SELECT
      ROUND(100 * SUM(CASE WHEN view_count > 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS repeatViewersPct
    FROM (
      SELECT user_id, COUNT(*) AS view_count
      FROM video_views
      WHERE video_id = ?
      GROUP BY user_id
    ) x
  `;
  console.log('REPEAT SQL:', repeatViewersSql);
  console.log('REPEAT PARAMS:', [videoId]);

  const perViewSql = `
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    vv.id AS view_id,
    vv.view_number,
    vv.device_type,
    vv.watch_duration_seconds,
    vv.started_at,
    vv.ended_at
  FROM video_views vv
  JOIN users u ON u.id = vv.user_id
  WHERE vv.video_id = ?${searchClause}
  ORDER BY u.id, vv.view_number ASC
`;
  console.log('PER-VIEW SQL:', perViewSql);
  console.log('PER-USER PARAMS:', [videoId, ...searchParams]);

  const queryParams = [videoId, ...searchParams];

  // Helpful debug: show actual users table columns (no-op if permission denied)
  db.query("SHOW COLUMNS FROM users", (showErr, showCols) => {
    if (showErr) {
      console.warn('Could not SHOW COLUMNS FROM users:', showErr.message);
    } else {
      console.log('users table columns:', showCols.map(c => c.Field).join(', '));
    }

    db.query(summarySql, queryParams, (err, summaryRows) => {
      if (err) {
        console.error("analytics summary error:", err);
        return res.status(500).json({ message: "Server error" });
      }

      db.query(repeatViewersSql, [videoId], (errRepeat, repeatRows) => {
        if (errRepeat) {
          console.error("repeat viewers error:", errRepeat);
          return res.status(500).json({ message: "Server error" });
        }

        const repeatViewers = repeatRows[0]?.repeatViewersPct || 0;

        db.query(perViewSql, queryParams, (err2, viewRows) => {
          if (err2) {
            console.error("analytics per-user error:", err2);
            return res.status(500).json({ message: "Server error" });
          }

          // Group flat view rows into { user_id, user_name, views: [...] }
          const usersMap = new Map();
          viewRows.forEach((row) => {
            if (!usersMap.has(row.user_id)) {
              usersMap.set(row.user_id, {
                user_id: row.user_id,
                user_name: row.user_name,
                views: [],
              });
            }
            usersMap.get(row.user_id).views.push({
              view_id: row.view_id,
              view_number: row.view_number,
              device_type: row.device_type,
              watch_duration_seconds: row.watch_duration_seconds,
              started_at: row.started_at,
              ended_at: row.ended_at,
            });
          });

          res.status(200).json({
            summary: {
              ...summaryRows[0],
              repeatViewers,
            },
            users: Array.from(usersMap.values()),
          });
        });
      });
    });
  });
};

// GET /videos/:videoId/analytics-summary
export const analyticsSummary = (req, res) => {
  const { videoId } = req.params;

  const summarySql = `
    SELECT
      COUNT(*) AS totalViews,
      COUNT(DISTINCT user_id) AS uniqueViewers,
      AVG(watch_duration_seconds) AS avgWatchSeconds
    FROM video_views
    WHERE video_id = ?
  `;

  const repeatViewersSql = `
    SELECT
      ROUND(100 * SUM(CASE WHEN view_count > 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS repeatViewersPct
    FROM (
      SELECT user_id, COUNT(*) AS view_count
      FROM video_views
      WHERE video_id = ?
      GROUP BY user_id
    ) x
  `;

  db.query(summarySql, [videoId], (err, summaryRows) => {
    if (err) {
      console.error('analyticsSummary error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    const summary = summaryRows[0] || { totalViews: 0, uniqueViewers: 0, avgWatchSeconds: null };

    db.query(repeatViewersSql, [videoId], (err2, repeatRows) => {
      if (err2) {
        console.error('analyticsSummary repeat error:', err2);
        return res.status(500).json({ message: 'Server error' });
      }

      const repeatViewers = repeatRows[0]?.repeatViewersPct || 0;

      // Format avgWatchSeconds to mm:ss
      const avgSeconds = summary.avgWatchSeconds ? Math.round(summary.avgWatchSeconds) : 0;
      const minutes = Math.floor(avgSeconds / 60);
      const seconds = Math.floor(avgSeconds % 60);
      const mmss = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      res.status(200).json({
        totalViews: summary.totalViews || 0,
        uniqueViewers: summary.uniqueViewers || 0,
        avgWatchTime: summary.avgWatchSeconds ? mmss : '0:00',
        repeatViewers: repeatViewers,
      });
    });
  });
};

// GET /videos/:videoId/analytics-users?search=name
export const analyticsUsers = (req, res) => {
  const { videoId } = req.params;
  const search = req.query.search ? req.query.search.trim() : '';

  let sql = `
    SELECT
      u.id AS user_id,
      u.name AS user,
      COUNT(vv.id) AS views,
      MIN(vv.started_at) AS firstWatch,
      MAX(vv.started_at) AS lastWatch,
      DATE_FORMAT(MAX(vv.started_at), '%Y-%m-%d %H:%i:%s') AS lastWatchedOn
    FROM video_views vv
    JOIN users u ON u.id = vv.user_id
    WHERE vv.video_id = ?`;

  const params = [videoId];

  if (search) {
    sql += ` AND u.name LIKE ?`;
    params.push(`%${search}%`);
  }

  sql += ` GROUP BY u.id, u.name ORDER BY lastWatch DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('analyticsUsers error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.status(200).json({ users: rows });
  });
};

// GET /batches
// Returns all batches for the batch selector dropdown
export const listBatches = (req, res) => {
  const sql = `SELECT id, batch_name AS name FROM batches ORDER BY batch_name ASC`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("listBatches error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ batches: rows });
  });
};

// ============================================================
// GET /admin/users/search-views?name=Aravind
// Used by the admin dashboard "Search student watch history" box.
// Returns the student's full watch history across ALL videos.
// ============================================================
export const searchStudentWatchHistory = (req, res) => {
  const name = req.query.name ? req.query.name.trim() : "";

  if (!name) {
    return res.status(400).json({ message: "name query param is required" });
  }

  const sql = `
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      v.id AS video_id,
      v.title AS video_title,
      vv.view_number,
      vv.device_type,
      vv.watch_duration_seconds,
      vv.started_at,
      vv.ended_at
    FROM video_views vv
    JOIN users u ON u.id = vv.user_id
    JOIN videos v ON v.id = vv.video_id
    WHERE u.name LIKE ?
    ORDER BY vv.started_at DESC
  `;

  db.query(sql, [`%${name}%`], (err, rows) => {
    if (err) {
      console.error("searchStudentWatchHistory error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ results: rows });
  });
};

// ============================================================
// GET /admin/batches/videos-analytics?batchIds=3A/2025,demo&userSearch=xxx
// Used by the admin dashboard when one or more batches are selected
// (without picking a single video): returns watched-user details
// across ALL videos in those batches, each row tagged with video_title.
// ============================================================
export const getBatchVideosAnalytics = (req, res) => {
  const batchIdsRaw = req.query.batchIds ? String(req.query.batchIds) : "";
  const batchNames = batchIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const userSearch = req.query.userSearch ? req.query.userSearch.trim() : "";

  if (batchNames.length === 0) {
    return res.status(400).json({ message: "batchIds query param is required" });
  }

  let searchClause = "";
  const searchParams = [];
  if (userSearch) {
    searchClause = " AND (CAST(u.id AS CHAR) LIKE ? OR u.name LIKE ?)";
    const likeSearch = `%${userSearch}%`;
    searchParams.push(likeSearch, likeSearch);
  }

  const sql = `
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      v.id AS video_id,
      v.title AS video_title,
      vv.id AS view_id,
      vv.view_number,
      vv.device_type,
      vv.watch_duration_seconds,
      vv.started_at,
      vv.ended_at
    FROM video_views vv
    JOIN users u ON u.id = vv.user_id
    JOIN videos v ON v.id = vv.video_id
    WHERE v.batch IN (?)${searchClause}
    ORDER BY u.id, v.id, vv.view_number ASC
  `;

  db.query(sql, [batchNames, ...searchParams], (err, rows) => {
    if (err) {
      console.error("getBatchVideosAnalytics error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    // Group flat rows into { user_id, user_name, video_id, video_title, views: [...] }
    const grouped = new Map();
    rows.forEach((row) => {
      const key = `${row.user_id}_${row.video_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          user_id: row.user_id,
          user_name: row.user_name,
          video_id: row.video_id,
          video_title: row.video_title,
          views: [],
        });
      }
      grouped.get(key).views.push({
        view_id: row.view_id,
        view_number: row.view_number,
        device_type: row.device_type,
        watch_duration_seconds: row.watch_duration_seconds,
        started_at: row.started_at,
        ended_at: row.ended_at,
      });
    });

    res.status(200).json({ rows: Array.from(grouped.values()) });
  });
};

// ============================================================
// GET /admin/videos/videos-analytics?videoIds=126,127&userSearch=xxx
// Used by the admin dashboard when TWO OR MORE specific videos are selected
// (multi-select "Select a video" chips): returns watched-user details across
// exactly those videos, each row tagged with video_title. Mirrors
// getBatchVideosAnalytics above but filters by video id instead of batch.
// ============================================================
export const getVideosAnalytics = (req, res) => {
  const videoIdsRaw = req.query.videoIds ? String(req.query.videoIds) : "";
  const videoIds = videoIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const userSearch = req.query.userSearch ? req.query.userSearch.trim() : "";

  if (videoIds.length === 0) {
    return res.status(400).json({ message: "videoIds query param is required" });
  }

  let searchClause = "";
  const searchParams = [];
  if (userSearch) {
    searchClause = " AND (CAST(u.id AS CHAR) LIKE ? OR u.name LIKE ?)";
    const likeSearch = `%${userSearch}%`;
    searchParams.push(likeSearch, likeSearch);
  }

  const sql = `
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      v.id AS video_id,
      v.title AS video_title,
      vv.id AS view_id,
      vv.view_number,
      vv.device_type,
      vv.watch_duration_seconds,
      vv.started_at,
      vv.ended_at
    FROM video_views vv
    JOIN users u ON u.id = vv.user_id
    JOIN videos v ON v.id = vv.video_id
    WHERE v.id IN (?)${searchClause}
    ORDER BY u.id, v.id, vv.view_number ASC
  `;

  db.query(sql, [videoIds, ...searchParams], (err, rows) => {
    if (err) {
      console.error("getVideosAnalytics error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    const grouped = new Map();
    rows.forEach((row) => {
      const key = `${row.user_id}_${row.video_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          user_id: row.user_id,
          user_name: row.user_name,
          video_id: row.video_id,
          video_title: row.video_title,
          views: [],
        });
      }
      grouped.get(key).views.push({
        view_id: row.view_id,
        view_number: row.view_number,
        device_type: row.device_type,
        watch_duration_seconds: row.watch_duration_seconds,
        started_at: row.started_at,
        ended_at: row.ended_at,
      });
    });

    res.status(200).json({ rows: Array.from(grouped.values()) });
  });
};

// ============================================================
// GET /admin/users/search-context?name=Aravind&batchIds=3A/2025&videoIds=126,127
// Used by the "Search user name" + Search button, aware of whatever
// batch(es)/video(s) are currently selected on the page:
//   - no batch/video selected  -> full watch history across everything
//   - batch(es) selected       -> flags users who aren't in those batch(es)
//   - video(s) selected too    -> flags users who are in the batch but
//                                  haven't watched the selected video(s)
// Returns one entry per matching user (by name or id) with enough info
// for the frontend to decide which message/state to show.
// ============================================================
export const contextualUserSearch = (req, res) => {
  const name = req.query.name ? req.query.name.trim() : "";
  const batchIdsRaw = req.query.batchIds ? String(req.query.batchIds) : "";
  const batchNames = batchIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const videoIdsRaw = req.query.videoIds ? String(req.query.videoIds) : "";
  const videoIds = videoIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  if (!name) {
    return res.status(400).json({ message: "name query param is required" });
  }

  const likeName = `%${name}%`;
  const userSql = `SELECT id, name, batch FROM users WHERE name LIKE ? OR CAST(id AS CHAR) LIKE ? ORDER BY name ASC`;

  db.query(userSql, [likeName, likeName], (err, userRows) => {
    if (err) {
      console.error("contextualUserSearch (user lookup) error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (userRows.length === 0) {
      return res.status(200).json({ matches: [] });
    }

    const userIds = userRows.map((u) => u.id);
    let viewSql = `
      SELECT
        vv.id AS view_id,
        vv.user_id,
        vv.video_id,
        v.title AS video_title,
        vv.view_number,
        vv.device_type,
        vv.watch_duration_seconds,
        vv.started_at,
        vv.ended_at
      FROM video_views vv
      JOIN videos v ON v.id = vv.video_id
      WHERE vv.user_id IN (?)
    `;
    const viewParams = [userIds];

    if (videoIds.length > 0) {
      viewSql += ` AND vv.video_id IN (?)`;
      viewParams.push(videoIds);
    } else if (batchNames.length > 0) {
      viewSql += ` AND v.batch IN (?)`;
      viewParams.push(batchNames);
    }
    viewSql += ` ORDER BY vv.user_id, vv.video_id, vv.view_number ASC`;

    db.query(viewSql, viewParams, (err2, viewRows) => {
      if (err2) {
        console.error("contextualUserSearch (views lookup) error:", err2);
        return res.status(500).json({ message: "Server error" });
      }

      const viewsByUser = new Map();
      viewRows.forEach((row) => {
        if (!viewsByUser.has(row.user_id)) viewsByUser.set(row.user_id, []);
        viewsByUser.get(row.user_id).push(row);
      });

      const matches = userRows.map((u) => {
        const inSelectedBatches = batchNames.length === 0 ? true : batchNames.includes(u.batch);
        const userViewRows = viewsByUser.get(u.id) || [];
        const watchedSelectedVideo =
          videoIds.length === 0 ? userViewRows.length > 0 : userViewRows.some((r) => videoIds.includes(String(r.video_id)));

        const groupedByVideo = new Map();
        userViewRows.forEach((r) => {
          if (!groupedByVideo.has(r.video_id)) {
            groupedByVideo.set(r.video_id, { video_id: r.video_id, video_title: r.video_title, views: [] });
          }
          groupedByVideo.get(r.video_id).views.push({
            view_id: r.view_id,
            view_number: r.view_number,
            device_type: r.device_type,
            watch_duration_seconds: r.watch_duration_seconds,
            started_at: r.started_at,
            ended_at: r.ended_at,
          });
        });

        return {
          user_id: u.id,
          user_name: u.name,
          user_batch: u.batch,
          in_selected_batches: inSelectedBatches,
          watched_selected_video: watchedSelectedVideo,
          videos: Array.from(groupedByVideo.values()),
        };
      });

      res.status(200).json({ matches });
    });
  });
};

// ============================================================
// GET /videos/analytics/weekly-watched
// Admin dashboard: how many students watched a video each of the last 7
// days (today + previous 6), for the "Last 7 Days" trend chart. Always
// returns exactly 7 entries, oldest first, filling in 0 for days with no
// activity at all.
// ============================================================
export const getWeeklyWatchTrend = async (req, res) => {
  try {
    const [rows] = await db1.query(`
      SELECT
        DATE_FORMAT(started_at, '%Y-%m-%d') AS day,
        COUNT(*) AS views,
        COUNT(DISTINCT user_id) AS students
      FROM video_views
      WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d')
    `);

    const byDay = new Map(
      rows.map((r) => [r.day, { views: Number(r.views) || 0, students: Number(r.students) || 0 }])
    );

    const formatKey = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatKey(d);
      const entry = byDay.get(key) || { views: 0, students: 0 };
      days.push({
        date: key,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        views: entry.views,
        students: entry.students,
      });
    }

    res.json({ success: true, days });
  } catch (err) {
    console.error("Error fetching weekly watch trend:", err);
    res.status(500).json({ success: false, error: "Failed to fetch weekly watch trend" });
  }
};

// ============================================================
// GET /videos/analytics/watched?range=today|last15|month|last30|year
// Admin dashboard: powers the "Watch Activity" trend chart's date-range
// filter. Buckets by hour for "today", by day for last15/month/last30, and
// by month for "year" — always filling in zero-activity buckets so the
// chart never has gaps.
// ============================================================
// ============================================================
// GET /videos/analytics/watched?range=today|week|last15|month|year|custom
//     &from=YYYY-MM-DD&to=YYYY-MM-DD (only used when range=custom)
//     &videoId=123   (optional — restrict to one video, e.g. from the
//                     "search videos or course" box)
//     &batch=3A/2025 (optional — restrict to one course/batch)
// Admin dashboard: powers the "Watch Activity" trend chart's date-range
// filter. Buckets by hour for "today", by day for week/last15/month/short
// custom ranges, and by month for "year"/long custom ranges — always
// filling in zero-activity buckets so the chart never has gaps.
// ============================================================
export const getWatchTrend = async (req, res) => {
  const range = req.query.range || "today";
  const { videoId, batch, from, to } = req.query;
  const now = new Date();

  // Extra WHERE clauses + params shared by every branch below, for the
  // optional video/course filter (applied on top of whatever date window
  // that branch already computes).
  const extraJoins = batch ? "JOIN videos v ON v.id = vv.video_id" : "";
  const extraWhere = [];
  const extraParams = [];
  if (videoId) {
    extraWhere.push("vv.video_id = ?");
    extraParams.push(videoId);
  }
  if (batch) {
    extraWhere.push("v.batch LIKE ?");
    extraParams.push(`%${batch}%`);
  }
  const extraSql = extraWhere.length ? ` AND ${extraWhere.join(" AND ")}` : "";

  try {
    let days = [];

    if (range === "today") {
      // Hourly buckets, midnight through the current hour.
      const [rows] = await db1.query(
        `
        SELECT
          DATE_FORMAT(vv.started_at, '%H') AS bucket,
          COUNT(*) AS views,
          COUNT(DISTINCT vv.user_id) AS students
        FROM video_views vv
        ${extraJoins}
        WHERE DATE(vv.started_at) = CURDATE()${extraSql}
        GROUP BY DATE_FORMAT(vv.started_at, '%H')
      `,
        extraParams
      );
      const byHour = new Map(
        rows.map((r) => [r.bucket, { views: Number(r.views) || 0, students: Number(r.students) || 0 }])
      );

      const currentHour = now.getHours();
      for (let h = 0; h <= currentHour; h++) {
        const key = String(h).padStart(2, "0");
        const entry = byHour.get(key) || { views: 0, students: 0 };
        const labelDate = new Date();
        labelDate.setHours(h, 0, 0, 0);
        days.push({
          date: key,
          label: labelDate.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
          views: entry.views,
          students: entry.students,
        });
      }
    } else if (range === "week" || range === "last15" || range === "month") {
      // Daily buckets: "week" goes back to Monday, "last15" a fixed 14-day
      // window, "month" back to the 1st of the current month.
      let daysBack;
      if (range === "week") {
        const day = now.getDay(); // 0 = Sunday ... 6 = Saturday
        daysBack = day === 0 ? 6 : day - 1;
      } else if (range === "last15") {
        daysBack = 14;
      } else {
        daysBack = now.getDate() - 1;
      }

      const [rows] = await db1.query(
        `
        SELECT
          DATE_FORMAT(vv.started_at, '%Y-%m-%d') AS day,
          COUNT(*) AS views,
          COUNT(DISTINCT vv.user_id) AS students
        FROM video_views vv
        ${extraJoins}
        WHERE vv.started_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${extraSql}
        GROUP BY DATE_FORMAT(vv.started_at, '%Y-%m-%d')
      `,
        [daysBack, ...extraParams]
      );
      const byDay = new Map(
        rows.map((r) => [r.day, { views: Number(r.views) || 0, students: Number(r.students) || 0 }])
      );

      const formatKey = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      for (let i = daysBack; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = formatKey(d);
        const entry = byDay.get(key) || { views: 0, students: 0 };
        days.push({
          date: key,
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          views: entry.views,
          students: entry.students,
        });
      }
    } else if (range === "year") {
      // Monthly buckets, January through the current month.
      const [rows] = await db1.query(
        `
        SELECT
          DATE_FORMAT(vv.started_at, '%Y-%m') AS month,
          COUNT(*) AS views,
          COUNT(DISTINCT vv.user_id) AS students
        FROM video_views vv
        ${extraJoins}
        WHERE YEAR(vv.started_at) = YEAR(CURDATE())${extraSql}
        GROUP BY DATE_FORMAT(vv.started_at, '%Y-%m')
      `,
        extraParams
      );
      const byMonth = new Map(
        rows.map((r) => [r.month, { views: Number(r.views) || 0, students: Number(r.students) || 0 }])
      );

      const year = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed
      for (let m = 0; m <= currentMonth; m++) {
        const key = `${year}-${String(m + 1).padStart(2, "0")}`;
        const entry = byMonth.get(key) || { views: 0, students: 0 };
        const labelDate = new Date(year, m, 1);
        days.push({
          date: key,
          label: labelDate.toLocaleDateString("en-US", { month: "short" }),
          views: entry.views,
          students: entry.students,
        });
      }
    } else if (range === "custom") {
      // Custom "date to date" range. Buckets by day if the span is short
      // enough to stay readable, otherwise by month (same rule the frontend
      // chart uses elsewhere).
      if (!from || !to) {
        return res.status(400).json({ success: false, error: "from and to are required for a custom range" });
      }
      const fromDate = new Date(`${from}T00:00:00`);
      const toDate = new Date(`${to}T23:59:59`);
      const spanDays = Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)));

      if (spanDays <= 62) {
        const [rows] = await db1.query(
          `
          SELECT
            DATE_FORMAT(vv.started_at, '%Y-%m-%d') AS day,
            COUNT(*) AS views,
            COUNT(DISTINCT vv.user_id) AS students
          FROM video_views vv
          ${extraJoins}
          WHERE vv.started_at >= ? AND vv.started_at <= ?${extraSql}
          GROUP BY DATE_FORMAT(vv.started_at, '%Y-%m-%d')
        `,
          [fromDate, toDate, ...extraParams]
        );
        const byDay = new Map(
          rows.map((r) => [r.day, { views: Number(r.views) || 0, students: Number(r.students) || 0 }])
        );

        const formatKey = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };

        for (let i = 0; i <= spanDays; i++) {
          const d = new Date(fromDate);
          d.setDate(d.getDate() + i);
          const key = formatKey(d);
          const entry = byDay.get(key) || { views: 0, students: 0 };
          days.push({
            date: key,
            label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            views: entry.views,
            students: entry.students,
          });
        }
      } else {
        const [rows] = await db1.query(
          `
          SELECT
            DATE_FORMAT(vv.started_at, '%Y-%m') AS month,
            COUNT(*) AS views,
            COUNT(DISTINCT vv.user_id) AS students
          FROM video_views vv
          ${extraJoins}
          WHERE vv.started_at >= ? AND vv.started_at <= ?${extraSql}
          GROUP BY DATE_FORMAT(vv.started_at, '%Y-%m')
        `,
          [fromDate, toDate, ...extraParams]
        );
        const byMonth = new Map(
          rows.map((r) => [r.month, { views: Number(r.views) || 0, students: Number(r.students) || 0 }])
        );

        const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
        const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
        while (cursor <= end) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          const entry = byMonth.get(key) || { views: 0, students: 0 };
          days.push({
            date: key,
            label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            views: entry.views,
            students: entry.students,
          });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
    } else {
      return res.status(400).json({ success: false, error: "Invalid range" });
    }

    res.json({ success: true, days });
  } catch (err) {
    console.error("Error fetching watch trend:", err);
    res.status(500).json({ success: false, error: "Failed to fetch watch trend" });
  }
};

// ============================================================
// GET /videos/analytics/views-by-batch?range=today|week|last15|month|year
// Admin dashboard: powers the "Views by Course" donut. Views live on
// video_views, not on the video record itself, so this joins to videos to
// get each view's batch and sums per batch, restricted to the selected
// date range.
// ============================================================
// ============================================================
// GET /videos/analytics/views-by-batch?range=today|week|last15|month|year|custom
//     &from=YYYY-MM-DD&to=YYYY-MM-DD (only used when range=custom)
//     &videoId=123 (optional — restrict to one video)
//     &batch=3A/2025 (optional — restrict to one course/batch)
// Admin dashboard: powers the "Views by Course" donut. Views live on
// video_views, not on the video record itself, so this joins to videos to
// get each view's batch and sums per batch, restricted to the selected
// date range (and, optionally, to a single searched video/course).
// ============================================================
export const getViewsByBatch = async (req, res) => {
  const range = req.query.range || "today";
  const { videoId, batch, from, to } = req.query;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end = null;

  switch (range) {
    case "today":
      break;
    case "week": {
      const day = start.getDay(); // 0 = Sunday ... 6 = Saturday
      const diffToMonday = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diffToMonday);
      break;
    }
    case "last15":
      start.setDate(start.getDate() - 14);
      break;
    case "month":
      start.setDate(1);
      break;
    case "year":
      start.setMonth(0, 1);
      break;
    case "custom": {
      if (!from || !to) {
        return res.status(400).json({ success: false, error: "from and to are required for a custom range" });
      }
      start.setTime(new Date(`${from}T00:00:00`).getTime());
      end = new Date(`${to}T23:59:59`);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: "Invalid range" });
  }

  const extraWhere = [];
  const extraParams = [];
  if (end) {
    extraWhere.push("vv.started_at <= ?");
    extraParams.push(end);
  }
  if (videoId) {
    extraWhere.push("vv.video_id = ?");
    extraParams.push(videoId);
  }
  if (batch) {
    extraWhere.push("v.batch LIKE ?");
    extraParams.push(`%${batch}%`);
  }
  const extraSql = extraWhere.length ? ` AND ${extraWhere.join(" AND ")}` : "";

  try {
    const [rows] = await db1.query(
      `
      SELECT v.batch AS batch, COUNT(*) AS views
      FROM video_views vv
      JOIN videos v ON v.id = vv.video_id
      WHERE vv.started_at >= ?${extraSql}
      GROUP BY v.batch
      `,
      [start, ...extraParams]
    );

    res.json({
      success: true,
      segments: rows.map((r) => ({ batch: r.batch, views: Number(r.views) || 0 })),
    });
  } catch (err) {
    console.error("Error fetching views by batch:", err);
    res.status(500).json({ success: false, error: "Failed to fetch views by batch" });
  }
};
// Student dashboard: powers the "Videos Watched" and "Time Spent" stat
// cards — unique videos watched and total seconds actually spent watching,
// for the logged-in student only.
// ============================================================
export const getMyWatchStats = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not identified" });
  }

  const sql = `
    SELECT
      COUNT(DISTINCT video_id) AS uniqueVideosWatched,
      COALESCE(SUM(watch_duration_seconds), 0) AS totalWatchSeconds
    FROM video_views
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("getMyWatchStats error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    const row = rows[0] || {};
    res.status(200).json({
      uniqueVideosWatched: Number(row.uniqueVideosWatched) || 0,
      totalWatchSeconds: Number(row.totalWatchSeconds) || 0,
    });
  });
};
// ============================================================
// GET /api/videos/analytics/top-videos?range=today|week|last15|month|year|custom
//     &from=YYYY-MM-DD&to=YYYY-MM-DD (only used when range=custom)
//     &limit=8 (optional, default 8)
// Admin dashboard: powers the "Top Videos by Views" column chart. Same date
// range rules as views-by-batch, just grouped by video instead of batch.
// ============================================================
export const getTopVideos = async (req, res) => {
  const range = req.query.range || "today";
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 25);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end = null;

  switch (range) {
    case "today":
      break;
    case "week": {
      const day = start.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diffToMonday);
      break;
    }
    case "last15":
      start.setDate(start.getDate() - 14);
      break;
    case "month":
      start.setDate(1);
      break;
    case "year":
      start.setMonth(0, 1);
      break;
    case "custom": {
      const { from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ success: false, error: "from and to are required for a custom range" });
      }
      start.setTime(new Date(`${from}T00:00:00`).getTime());
      end = new Date(`${to}T23:59:59`);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: "Invalid range" });
  }

  const extraWhere = [];
  const extraParams = [];
  if (end) {
    extraWhere.push("vv.started_at <= ?");
    extraParams.push(end);
  }
  const extraSql = extraWhere.length ? ` AND ${extraWhere.join(" AND ")}` : "";

  try {
    const [rows] = await db1.query(
      `
      SELECT v.id AS video_id, v.title AS title, v.batch AS batch, COUNT(*) AS views
      FROM video_views vv
      JOIN videos v ON v.id = vv.video_id
      WHERE vv.started_at >= ?${extraSql}
      GROUP BY v.id, v.title, v.batch
      ORDER BY views DESC
      LIMIT ?
      `,
      [start, ...extraParams, limit]
    );

    res.json({
      success: true,
      videos: rows.map((r) => ({
        videoId: r.video_id,
        title: r.title,
        batch: r.batch,
        views: Number(r.views) || 0,
      })),
    });
  } catch (err) {
    console.error("Error fetching top videos:", err);
    res.status(500).json({ success: false, error: "Failed to fetch top videos" });
  }
};