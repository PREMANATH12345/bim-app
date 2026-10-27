import express from "express";
import db from "../db.js";

const router = express.Router();

router.get('/users/search-views', async (req, res) => {
  const { name } = req.query;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name query param is required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT 
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
       ORDER BY vv.started_at DESC`,
      [`%${name.trim()}%`]
    );

    res.json({ results: rows });
  } catch (err) {
    console.error('search-views error:', err);
    res.status(500).json({ error: 'Failed to fetch user watch history' });
  }
});

export default router;
