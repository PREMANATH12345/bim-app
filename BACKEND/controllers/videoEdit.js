// import db1 from "../db1.js";

// export const getAllVideos = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ error: "Unauthorized: Admin access required" });
//     }

//     const [videos] = await db1.execute(
//       "SELECT id, video_url, title, description, batch FROM videos"
//     );

//     if (videos.length === 0) {
//       return res.status(404).json({ error: "No videos found" });
//     }

//     res.status(200).json({ videos });
//   } catch (error) {
//     console.error("Error fetching videos:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const editVideo = async (req, res) => {
//   try {
//     const { id, title, description, video_url, batch } = req.body;

//     // Check if the user is an admin
//     if (req.user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ error: "Unauthorized: Admin access required" });
//     }

//     // Check if the video exists
//     const [video] = await db1.execute("SELECT id FROM videos WHERE id = ?", [
//       id,
//     ]);

//     if (video.length === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }

//     // Update the video details, including batch
//     await db1.execute(
//       "UPDATE videos SET title = ?, description = ?, video_url = ?, batch = ? WHERE id = ?",
//       [title, description, video_url, batch, id]
//     );

//     res.status(200).json({ message: "Video updated successfully" });
//   } catch (error) {
//     console.error("Error updating video:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const deleteVideo = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if the user is an admin
//     if (req.user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ error: "Unauthorized: Admin access required" });
//     }

//     // Check if the video exists
//     const [video] = await db1.execute("SELECT id FROM videos WHERE id = ?", [
//       id,
//     ]);

//     if (video.length === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }

//     // Delete the video
//     await db1.execute("DELETE FROM videos WHERE id = ?", [id]);

//     res.status(200).json({ message: "Video deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting video:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };





// hmark-----------------------------------------------------


// import db1 from "../db1.js";

// export const getAllVideos = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ error: "Unauthorized: Admin access required" });
//     }

//     // Updated query to include quiz information
//     const [videos] = await db1.execute(`
//       SELECT 
//         v.id, 
//         v.video_url, 
//         v.title, 
//         v.description, 
//         v.batch,
//         v.quiz_id,
//         q.title as quiz_title
//       FROM videos v 
//       LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id
//     `);

//     if (videos.length === 0) {
//       return res.status(404).json({ error: "No videos found" });
//     }

//     // Transform data to include quiz information
//     const videosWithQuiz = videos.map(video => ({
//       id: video.id,
//       video_url: video.video_url,
//       title: video.title,
//       description: video.description,
//       batch: video.batch,
//       quiz: video.quiz_id ? {
//         id: video.quiz_id,
//         title: video.quiz_title
//       } : null
//     }));

//     res.status(200).json({ videos: videosWithQuiz });
//   } catch (error) {
//     console.error("Error fetching videos:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const editVideo = async (req, res) => {
//   try {
//     const { id, title, description, video_url, batch, quiz_id } = req.body;

//     // Check if the user is an admin
//     if (req.user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ error: "Unauthorized: Admin access required" });
//     }

//     // Check if the video exists
//     const [video] = await db1.execute("SELECT id FROM videos WHERE id = ?", [
//       id,
//     ]);

//     if (video.length === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }

//     // Update the video details, including batch and quiz_id
//     await db1.execute(
//       "UPDATE videos SET title = ?, description = ?, video_url = ?, batch = ?, quiz_id = ? WHERE id = ?",
//       [title, description, video_url, batch, quiz_id || null, id]
//     );

//     res.status(200).json({ message: "Video updated successfully" });
//   } catch (error) {
//     console.error("Error updating video:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const deleteVideo = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if the user is an admin
//     if (req.user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ error: "Unauthorized: Admin access required" });
//     }

//     // Check if the video exists
//     const [video] = await db1.execute("SELECT id FROM videos WHERE id = ?", [
//       id,
//     ]);

//     if (video.length === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }

//     // Delete the video
//     await db1.execute("DELETE FROM videos WHERE id = ?", [id]);

//     res.status(200).json({ message: "Video deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting video:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


import db1 from "../db1.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "../config/s3Client.js";

export const getAllVideos = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Admin access required" });
    }

    // Updated query to include quiz information
    const [videos] = await db1.execute(`
      SELECT 
        v.id, 
        v.video_url, 
        v.title, 
        v.description, 
        v.batch,
        v.quiz_id,
        q.title as quiz_title
      FROM videos v 
      LEFT JOIN quizzes q ON v.quiz_id = q.quiz_id
    `);

    if (videos.length === 0) {
      return res.status(404).json({ error: "No videos found" });
    }

    // Transform data to include quiz information
    const videosWithQuiz = videos.map(video => ({
      id: video.id,
      video_url: video.video_url,
      title: video.title,
      description: video.description,
      batch: video.batch,
      quiz: video.quiz_id ? {
        id: video.quiz_id,
        title: video.quiz_title
      } : null
    }));

    res.status(200).json({ videos: videosWithQuiz });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editVideo = async (req, res) => {
  try {
    const { id, title, description, video_url, batch, quiz_id } = req.body;

    // Check if the user is an admin
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Admin access required" });
    }

    // Check if the video exists
    const [video] = await db1.execute("SELECT id FROM videos WHERE id = ?", [
      id,
    ]);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Update the video details, including batch and quiz_id
    await db1.execute(
      "UPDATE videos SET title = ?, description = ?, video_url = ?, batch = ?, quiz_id = ? WHERE id = ?",
      [title, description, video_url, batch, quiz_id || null, id]
    );

    res.status(200).json({ message: "Video updated successfully" });
  } catch (error) {
    console.error("Error updating video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the user is an admin
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Unauthorized: Admin access required" });
    }

    // Check if the video exists
    const [video] = await db1.execute("SELECT id, video_url FROM videos WHERE id = ?", [
      id,
    ]);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    const videoUrl = video[0].video_url;

    // Delete the video from DB
    await db1.execute("DELETE FROM videos WHERE id = ?", [id]);

    // If video is stored in S3, attempt cleanup
    if (videoUrl && videoUrl.includes(".amazonaws.com/")) {
      try {
        // Extract S3 key from URL: https://bucket.s3.region.amazonaws.com/videos/...
        const urlParts = videoUrl.split(".amazonaws.com/");
        if (urlParts.length > 1) {
          const s3Key = decodeURIComponent(urlParts[1]);
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: s3Key,
            })
          );
        }
      } catch (s3Err) {
        console.warn("Could not delete video from S3 (ignoring):", s3Err.message);
      }
    }

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};