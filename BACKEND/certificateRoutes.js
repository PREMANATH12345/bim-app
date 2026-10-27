import express from "express";
import {
  addCertificate,
  getAllCertificates,
  updateCertificate,
  getCertificateByCertificateId,
} from "./controllers/certificate.js";
import { authenticateToken } from "./middleware/authMiddleware.js"; // JWT auth middleware
import multer from "multer";
import path from "path";

const certificateRoutes = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/"); // Save files in the 'images' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  },
});

const upload = multer({ storage });

// ✅ Routes
certificateRoutes.post(
  "/",
  authenticateToken,
  upload.single("certificate_image"),
  addCertificate
);
certificateRoutes.get("/", authenticateToken, getAllCertificates);
certificateRoutes.put(
  "/:id",
  authenticateToken,
  upload.single("certificate_image"),
  updateCertificate
);
certificateRoutes.get(
  "/:certificate_id",
  getCertificateByCertificateId
);

export default certificateRoutes;
