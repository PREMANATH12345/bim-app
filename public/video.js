// import db1 from "../db1.js";
// import jwt from "jsonwebtoken";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Upload Video Controller - UPDATED with quiz_id
// export const uploadVideo = async (req, res) => {
//   const { batch, title, description, video, quiz_id } = req.body;

//   try {
//     const [result] = await db1.execute(
//       "INSERT INTO videos (batch, video_url, title, description, quiz_id) VALUES (?, ?, ?, ?, ?)",
//       [batch, video, title, description, quiz_id || null]
//     );
//     res.json({
//       message: "Video uploaded successfully",
//       videoId: result.insertId,
//     });
//   } catch (err) {
//     console.error("Upload error:", err);
//     res.status(500).json({ message: "Database error" });
//   }
// };

// export const getSignedVideos = async (req, res) => {
//   try {
//     const { id, batch, role } = req.user; // ✅ user info from JWT/session

//     if (!batch) {
//       return res.status(400).json({ error: "Batch information missing" });
//     }

//     // 🔹 Normalize batch into an array
//     let userBatches = [];
//     if (Array.isArray(batch)) {
//       userBatches = batch;
//     } else if (typeof batch === "string") {
//       try {
//         const parsed = JSON.parse(batch); // handle stringified array
//         if (Array.isArray(parsed)) {
//           userBatches = parsed;
//         } else {
//           userBatches = [batch]; // simple string
//         }
//       } catch {
//         userBatches = [batch]; // not JSON, just a plain string
//       }
//     } else {
//       userBatches = [String(batch)];
//     }

//     // 🔹 Fetch accessVideo from DB
//     const [userRows] = await db1.execute(
//       "SELECT accessVideo FROM users WHERE id = ?",
//       [id]
//     );

//     let accessibleVideos = [];
//     if (userRows.length > 0) {
//       try {
//         accessibleVideos = userRows[0].accessVideo
//           ? JSON.parse(userRows[0].accessVideo)
//           : [];
//       } catch {
//         accessibleVideos = [];
//       }
//     }

//     // 🔹 Fetch all videos for the batch(es)
//     const placeholders = userBatches.map(() => "?").join(","); // "?, ?, ?"
//     const [videos] = await db1.execute(
//       `
//       SELECT 
//         v.id, 
//         v.video_url, 
//         v.title, 
//         v.description,
//         v.quiz_id,
//         q.title as quiz_title,
//         q.total_questions,
//         q.visible_questions
//       FROM videos v 
//       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
//       WHERE v.batch IN (${placeholders})
//       `,
//       userBatches
//     );

//     // 🔹 Filter videos based on access rules (non-admin)
//     let filteredVideos = videos;
//     if (role !== "admin") {
//       if (accessibleVideos.length > 0) {
//         filteredVideos = videos.filter((video) =>
//           accessibleVideos.includes(video.id)
//         );
//       }
//       // else → full access
//     }

//     // 🔹 Generate signed URLs with quiz info
//     const signedVideos = filteredVideos.map((video) => ({
//       id: video.id,
//       signed_url: generateSignedURL(video.video_url.replace("/uploads/", "")),
//       title: video.title,
//       description: video.description,
//       quiz:
//         video.quiz_id && video.quiz_title
//           ? {
//               id: video.quiz_id,
//               title: video.quiz_title,
//               total_questions: video.total_questions,
//               visible_questions: video.visible_questions,
//             }
//           : null,
//     }));

//     res.status(200).json({ videos: signedVideos });
//   } catch (error) {
//     console.error("Error fetching videos:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };





// // Function to generate a signed URL
// const generateSignedURL = (filename) => {
//   const token = jwt.sign({ filename }, process.env.JWT_SECRET, {
//     expiresIn: "60m",
//   });

//   return `https://api.bimeducation.in/api/videos/stream-video/${token}`;
// };

// export const streamVideo = (req, res) => {
//   try {
//     const { token } = req.params;

//     // Verify token
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//         console.error("JWT Error:", err.message);
//         return res.status(403).json({ error: "Invalid or expired link" });
//       }

//       const videoPath = path.join(__dirname, "../uploads", decoded.filename);

//       if (!fs.existsSync(videoPath)) {
//         return res.status(404).json({ error: "Video not found" });
//       }

//       const stat = fs.statSync(videoPath);
//       const fileSize = stat.size;
//       const range = req.headers.range;

//       if (range) {
//         const parts = range.replace(/bytes=/, "").split("-");
//         const start = parseInt(parts[0], 10);
//         const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
//         const chunksize = end - start + 1;
//         const file = fs.createReadStream(videoPath, { start, end });

//         res.writeHead(206, {
//           "Content-Range": `bytes ${start}-${end}/${fileSize}`,
//           "Accept-Ranges": "bytes",
//           "Content-Length": chunksize,
//           "Content-Type": "video/mp4",
//         });

//         file.pipe(res);
//       } else {
//         res.writeHead(200, {
//           "Content-Length": fileSize,
//           "Content-Type": "video/mp4",
//         });

//         fs.createReadStream(videoPath).pipe(res);
//       }
//     });
//   } catch (error) {
//     console.error("Error streaming video:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // Get Video by ID - UPDATED to include full quiz with questions using new schema
// export const getSignedVideoById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Fetch the video by ID with quiz information (only non-deleted quizzes)
//     const [video] = await db1.execute(`
//       SELECT 
//         v.id, 
//         v.video_url, 
//         v.title, 
//         v.description,
//         v.quiz_id,
//         q.title as quiz_title,
//         q.course_name,
//         q.batch_name,
//         q.total_questions,
//         q.visible_questions,
//         q.display_mode
//       FROM videos v 
//       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
//       WHERE v.id = ?`,
//       [id]
//     );

//     if (video.length === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }

//     let quizData = null;
    
//     // If video has a linked quiz and quiz exists (not deleted), fetch the questions
//     if (video[0].quiz_id && video[0].quiz_title) {
//       const [questions] = await db1.execute(`
//         SELECT 
//           question_id,
//           question_text,
//           options,
//           correct_option
//         FROM quiz_questions 
//         WHERE quiz_id = ? AND is_deleted IS NULL`,
//         [video[0].quiz_id]
//       );

//       // Parse JSON options for each question
//       const parsedQuestions = questions.map(q => {
//         let parsedOptions = {};
//         try {
//           parsedOptions = JSON.parse(q.options);
//         } catch (parseErr) {
//           console.error('Error parsing options:', parseErr);
//           parsedOptions = {};
//         }

//         // Ensure correct_option is a string number
//         let correctOption = q.correct_option;
        
//         // Convert A, B, C, D to numbers if stored as letters (backward compatibility)
//         if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(correctOption)) {
//           const letterToNumber = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9', 'J': '10' };
//           correctOption = letterToNumber[correctOption] || correctOption;
//         }

//         return {
//           question_id: q.question_id,
//           question_text: q.question_text,
//           options: parsedOptions, // { "1": "Option 1", "2": "Option 2", ... }
//           correct_option: correctOption.toString()
//         };
//       });

//       quizData = {
//         id: video[0].quiz_id,
//         title: video[0].quiz_title,
//         course_name: video[0].course_name,
//         batch_name: video[0].batch_name,
//         total_questions: video[0].total_questions,
//         visible_questions: video[0].visible_questions,
//         display_mode: video[0].display_mode,
//         questions: parsedQuestions
//       };
//     }

//     // Return video data with complete quiz information
//     const videoData = {
//       id: video[0].id,
//       video_url: video[0].video_url,
//       title: video[0].title,
//       description: video[0].description,
//       quiz: quizData
//     };

//     res.status(200).json({ video: videoData });
//   } catch (error) {
//     console.error("Error fetching video by ID:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // Get Videos Grouped by Batch - UPDATED to include quiz info and handle soft deletes
// export const getVideosGroupedByBatch = async (req, res) => {
//   try {
//     const [videos] = await db1.execute(`
//       SELECT 
//         v.id, 
//         v.batch, 
//         v.video_url, 
//         v.title, 
//         v.description,
//         v.quiz_id,
//         q.title as quiz_title,
//         q.total_questions,
//         q.visible_questions
//       FROM videos v 
//       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL`
//     );

//     if (videos.length === 0) {
//       return res.status(404).json({ error: "No videos found" });
//     }

//     // Group videos by batch with quiz information
//     const groupedVideos = videos.reduce((acc, video) => {
//       const signedUrl = generateSignedURL(
//         video.video_url.replace("/uploads/", "")
//       );
//       if (!acc[video.batch]) {
//         acc[video.batch] = [];
//       }
//       acc[video.batch].push({
//         id: video.id,
//         signed_url: signedUrl,
//         title: video.title,
//         description: video.description,
//         quiz: video.quiz_id && video.quiz_title ? {
//           id: video.quiz_id,
//           title: video.quiz_title,
//           total_questions: video.total_questions,
//           visible_questions: video.visible_questions
//         } : null
//       });
//       return acc;
//     }, {});

//     res.status(200).json({ videos: groupedVideos });
//   } catch (error) {
//     console.error("Error fetching videos:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // Get all quizzes for dropdown in video upload form - UPDATED to exclude deleted quizzes
// export const getQuizzesForDropdown = async (req, res) => {
//   try {
//     const [quizzes] = await db1.execute(
//       "SELECT quiz_id, title, course_name, batch_name FROM quizzes WHERE is_deleted IS NULL ORDER BY title"
//     );

//     res.status(200).json({ quizzes });
//   } catch (error) {
//     console.error("Error fetching quizzes:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // Update video with quiz association
// export const updateVideoQuiz = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { batch, title, description, video, quiz_id } = req.body;

//     // If quiz_id is provided, verify it exists and is not deleted
//     if (quiz_id) {
//       const [quizCheck] = await db1.execute(
//         "SELECT quiz_id FROM quizzes WHERE quiz_id = ? AND is_deleted IS NULL",
//         [quiz_id]
//       );
      
//       if (quizCheck.length === 0) {
//         return res.status(400).json({ error: "Quiz not found or has been deleted" });
//       }
//     }

//     const [result] = await db1.execute(
//       "UPDATE videos SET batch = ?, title = ?, description = ?, video_url = ?, quiz_id = ? WHERE id = ?",
//       [batch, title, description, video, quiz_id || null, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }

//     res.json({
//       message: "Video updated successfully",
//       videoId: id,
//     });
//   } catch (error) {
//     console.error("Update error:", error);
//     res.status(500).json({ message: "Database error" });
//   }
// };





import db1 from "../db1.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload Video Controller - UPDATED with quiz_id
export const uploadVideo = async (req, res) => {
  const { batch, title, description, video, quiz_id } = req.body;

  try {
    const [result] = await db1.execute(
      "INSERT INTO videos (batch, video_url, title, description, quiz_id) VALUES (?, ?, ?, ?, ?)",
      [batch, video, title, description, quiz_id || null]
    );
    res.json({
      message: "Video uploaded successfully",
      videoId: result.insertId,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

// Get Videos by Batch Controller - UPDATED to include quiz info and handle soft deletes
// export const getSignedVideos = async (req, res) => {
//   try {
//     const { batch } = req.user; // Get batch from logged-in user

//     if (!batch) {
//       return res.status(400).json({ error: "Batch information missing" });
//     }

//     // Fetch video filenames with quiz information from the database (only non-deleted quizzes)
//     const [videos] = await db1.execute(`
//       SELECT 
//         v.id, 
//         v.video_url, 
//         v.title, 
//         v.description,
//         v.quiz_id,
//         q.title as quiz_title,
//         q.total_questions,
//         q.visible_questions
//       FROM videos v 
//       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
//       WHERE v.batch = ?`,
//       [batch]
//     );

//     // Generate signed URLs with quiz information
//     const signedVideos = videos.map((video) => ({
//       id: video.id,
//       signed_url: generateSignedURL(video.video_url.replace("/uploads/", "")),
//       title: video.title,
//       description: video.description,
//       quiz: video.quiz_id && video.quiz_title ? {
//         id: video.quiz_id,
//         title: video.quiz_title,
//         total_questions: video.total_questions,
//         visible_questions: video.visible_questions
//       } : null
//     }));
//     res.status(200).json({ videos: signedVideos });
//   } catch (error) {
//     console.error("Error fetching videos:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// 🔹 Turn a raw batch value — plain string ("4/2025"), JSON-ish array
// string ('["4/2025","1/2024"]'), or actual array — into a clean, deduped,
// lowercased array of batch names. Used for both the logged-in user's
// batch(es) and each video's batch field so the two can be compared
// reliably even if one is formatted slightly differently than the other
// (extra whitespace, brackets/quotes, casing).
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

export const getSignedVideos = async (req, res) => {
  try {
    const { id, batch, role } = req.user; // ✅ user info from JWT/session

    if (!batch) {
      return res.status(400).json({ error: "Batch information missing" });
    }

    const userBatches = normalizeBatchValues(batch);

    // 🔹 Fetch accessVideo AND fullAccessBatches from DB
    const [userRows] = await db1.execute(
      "SELECT accessVideo, fullAccessBatches FROM users WHERE id = ?",
      [id]
    );

    let accessibleVideos = [];
    let fullBatches = [];
    if (userRows.length > 0) {
      try {
        accessibleVideos = userRows[0].accessVideo
          ? JSON.parse(userRows[0].accessVideo)
          : [];
      } catch {
        accessibleVideos = [];
      }
      try {
        fullBatches = userRows[0].fullAccessBatches
          ? normalizeBatchValues(userRows[0].fullAccessBatches)
          : [];
      } catch {
        fullBatches = [];
      }
    }

    // 🔹 Fetch every video (with quiz info). Batch matching happens below in
    // JS rather than via an exact "WHERE v.batch = ?" — the batch column can
    // be a plain string or a JSON-ish array, and casing/whitespace can
    // differ from how the user's batch is stored, so an exact SQL match
    // silently returns zero rows whenever those don't line up exactly.
    const [allVideos] = await db1.execute(
      `
      SELECT 
        v.id, 
        v.batch,
        v.video_url, 
        v.title, 
        v.description,
        v.quiz_id,
        q.title as quiz_title,
        q.total_questions,
        q.visible_questions
      FROM videos v 
      LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
      `
    );

    // 🔹 Filter videos based on access rules (non-admin)
    let filteredVideos = allVideos;
    if (role !== "admin") {
      const userAccessSet = new Set(accessibleVideos.map((vId) => Number(vId)));
      const userAccessSetStr = new Set(accessibleVideos.map((vId) => String(vId)));
      const fullBatchesSet = new Set(fullBatches);
      const userBatchesSet = new Set(userBatches);

      filteredVideos = allVideos.filter((video) => {
        const vBatches = normalizeBatchValues(video.batch);

        // 1. Check if video's batch is in user's fullAccessBatches
        const isInFullAccess = vBatches.some((b) => fullBatchesSet.has(b));
        if (isInFullAccess) return true;

        // 2. Check if video ID is specifically granted in accessVideo
        const isSpecificallyGranted =
          userAccessSet.has(Number(video.id)) ||
          userAccessSetStr.has(String(video.id));
        if (isSpecificallyGranted) return true;

        // 3. Fallback: If student has no fullAccessBatches AND no accessVideo set at all,
        // default to full access for their registered batch(es)
        if (fullBatches.length === 0 && accessibleVideos.length === 0) {
          return vBatches.some((b) => userBatchesSet.has(b));
        }

        return false;
      });
    }

    // 🔹 Generate signed URLs with quiz info
    const signedVideos = filteredVideos.map((video) => ({
      id: video.id,
      batch: video.batch,
      signed_url: generateSignedURL(video.video_url.replace("/uploads/", "")),
      title: video.title,
      description: video.description,
      quiz:
        video.quiz_id && video.quiz_title
          ? {
              id: video.quiz_id,
              title: video.quiz_title,
              total_questions: video.total_questions,
              visible_questions: video.visible_questions,
            }
          : null,
    }));

    res.status(200).json({ videos: signedVideos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};





// Function to generate a signed URL
const generateSignedURL = (filename) => {
  const token = jwt.sign({ filename }, process.env.JWT_SECRET, {
    expiresIn: "60m",
  });

  return `https://api.bimeducation.in/api/videos/stream-video/${token}`;
};

export const streamVideo = (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT Error:", err.message);
        return res.status(403).json({ error: "Invalid or expired link" });
      }

      const videoPath = path.join(__dirname, "../uploads", decoded.filename);

      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: "Video not found" });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(videoPath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4",
        });

        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
        });

        fs.createReadStream(videoPath).pipe(res);
      }
    });
  } catch (error) {
    console.error("Error streaming video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get Video by ID - UPDATED to include full quiz with questions using new schema
export const getSignedVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the video by ID with quiz information (only non-deleted quizzes)
    const [video] = await db1.execute(`
      SELECT 
        v.id, 
        v.video_url, 
        v.title, 
        v.description,
        v.quiz_id,
        q.title as quiz_title,
        q.course_name,
        q.batch_name,
        q.total_questions,
        q.visible_questions,
        q.display_mode
      FROM videos v 
      LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
      WHERE v.id = ?`,
      [id]
    );

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    let quizData = null;
    
    // If video has a linked quiz and quiz exists (not deleted), fetch the questions
    if (video[0].quiz_id && video[0].quiz_title) {
      const [questions] = await db1.execute(`
        SELECT 
          question_id,
          question_text,
          options,
          correct_option
        FROM quiz_questions 
        WHERE quiz_id = ? AND is_deleted IS NULL`,
        [video[0].quiz_id]
      );

      // Parse JSON options for each question
      const parsedQuestions = questions.map(q => {
        let parsedOptions = {};
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (parseErr) {
          console.error('Error parsing options:', parseErr);
          parsedOptions = {};
        }

        // Ensure correct_option is a string number
        let correctOption = q.correct_option;
        
        // Convert A, B, C, D to numbers if stored as letters (backward compatibility)
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(correctOption)) {
          const letterToNumber = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9', 'J': '10' };
          correctOption = letterToNumber[correctOption] || correctOption;
        }

        return {
          question_id: q.question_id,
          question_text: q.question_text,
          options: parsedOptions, // { "1": "Option 1", "2": "Option 2", ... }
          correct_option: correctOption.toString()
        };
      });

      quizData = {
        id: video[0].quiz_id,
        title: video[0].quiz_title,
        course_name: video[0].course_name,
        batch_name: video[0].batch_name,
        total_questions: video[0].total_questions,
        visible_questions: video[0].visible_questions,
        display_mode: video[0].display_mode,
        questions: parsedQuestions
      };
    }

    // Return video data with complete quiz information
    const videoData = {
      id: video[0].id,
      video_url: video[0].video_url,
      title: video[0].title,
      description: video[0].description,
      quiz: quizData
    };

    res.status(200).json({ video: videoData });
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get Videos Grouped by Batch - UPDATED to include quiz info and handle soft deletes
export const getVideosGroupedByBatch = async (req, res) => {
  try {
    const [videos] = await db1.execute(`
      SELECT 
        v.id, 
        v.batch, 
        v.video_url, 
        v.title, 
        v.description,
        v.quiz_id,
        q.title as quiz_title,
        q.total_questions,
        q.visible_questions
      FROM videos v 
      LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL`
    );

    if (videos.length === 0) {
      return res.status(404).json({ error: "No videos found" });
    }

    // Group videos by batch with quiz information
    const groupedVideos = videos.reduce((acc, video) => {
      const signedUrl = generateSignedURL(
        video.video_url.replace("/uploads/", "")
      );
      if (!acc[video.batch]) {
        acc[video.batch] = [];
      }
      acc[video.batch].push({
        id: video.id,
        signed_url: signedUrl,
        title: video.title,
        description: video.description,
        quiz: video.quiz_id && video.quiz_title ? {
          id: video.quiz_id,
          title: video.quiz_title,
          total_questions: video.total_questions,
          visible_questions: video.visible_questions
        } : null
      });
      return acc;
    }, {});

    res.status(200).json({ videos: groupedVideos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all quizzes for dropdown in video upload form - UPDATED to exclude deleted quizzes
export const getQuizzesForDropdown = async (req, res) => {
  try {
    const [quizzes] = await db1.execute(
      "SELECT quiz_id, title, course_name, batch_name FROM quizzes WHERE is_deleted IS NULL ORDER BY title"
    );

    res.status(200).json({ quizzes });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Student: mark a video as completed (called by the player when the
// video plays through to the end). Safe to call more than once for the
// same video — the first completion date is kept, not overwritten.
export const markVideoCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db1.execute(
      `INSERT INTO video_completions (user_id, video_id, completed_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE video_id = video_id`,
      [userId, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking video completed:", error);
    res.status(500).json({ error: "Failed to mark video as completed" });
  }
};

// ✅ Student: get every video I've completed, newest first — used by the
// "Completed" section on the student Dashboard tab.
export const getMyCompletedVideos = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db1.execute(
      `SELECT
         v.id,
         v.title,
         v.batch,
         v.description,
         q.course_name,
         vc.completed_at
       FROM video_completions vc
       JOIN videos v ON v.id = vc.video_id
       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id AND q.is_deleted IS NULL
       WHERE vc.user_id = ?
       ORDER BY vc.completed_at DESC`,
      [userId]
    );

    res.json({ success: true, videos: rows });
  } catch (error) {
    console.error("Error fetching completed videos:", error);
    res.status(500).json({ error: "Failed to fetch completed videos" });
  }
};

// Update video with quiz association
export const updateVideoQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch, title, description, video, quiz_id } = req.body;

    // If quiz_id is provided, verify it exists and is not deleted
    if (quiz_id) {
      const [quizCheck] = await db1.execute(
        "SELECT quiz_id FROM quizzes WHERE quiz_id = ? AND is_deleted IS NULL",
        [quiz_id]
      );
      
      if (quizCheck.length === 0) {
        return res.status(400).json({ error: "Quiz not found or has been deleted" });
      }
    }

    const [result] = await db1.execute(
      "UPDATE videos SET batch = ?, title = ?, description = ?, video_url = ?, quiz_id = ? WHERE id = ?",
      [batch, title, description, video, quiz_id || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({
      message: "Video updated successfully",
      videoId: id,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Database error" });
  }
};