import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes.js";
import videoRoutes from "./videoRoutes.js";
import certificateRoutes from "./certificateRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import websiteQuizRoutes from "./websiteQuizRoutes.js";
import videoAnalyticsRoutes from "./controllers/videoviewroutes.js";
import adminRoutes from "./routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ extended: true, limit: "1gb" }));
app.use(
  cors({
    origin: "*", // Allow requests from your frontend
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,  
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // For video uploads
app.use("/images", express.static(path.join(__dirname, "images"))); // For certificate images

app.use("/api/videos", videoRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api", router);
app.use("/api", videoAnalyticsRoutes);
app.use("/api", adminRoutes);
app.use("/", videoAnalyticsRoutes);
app.use("/api/website-quiz", websiteQuizRoutes);


app.use((req, res, next) => {
  res.status(404).json({ error: "Route Not Found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Something went wrong. Please try again.",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
