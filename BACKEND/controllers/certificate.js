import db1 from "../db1.js";
import fs from "fs";
import path from "path";

// ✅ Helper function to verify admin
const verifyAdmin = (req) => {
  if (!req.user) {
    throw new Error("Unauthorized: User not authenticated");
  }
  if (req.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
};

// ✅ Add Certificate (Only Admin)
export const addCertificate = async (req, res) => {
  try {
    verifyAdmin(req); // ✅ Check if the user is an admin

    const {
      certificate_id,
      student_id,
      student_name,
      course_name,
      course_hours,
      enrollment_date,
      issue_date,
      attendance_percentage,
      assignment_percentage,
      trained_by,
    } = req.body;
    const certificate_image = req.file ? req.file.filename : null;

    const sql = `INSERT INTO certificates (certificate_id, student_name, course_name, course_hours, issue_date, assignment_percentage, trained_by, certificate_image, student_id, enrollment_date, attendance_percentage)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      certificate_id,
      student_name,
      course_name,
      course_hours,
      issue_date,
      assignment_percentage,
      trained_by,
      certificate_image,
      student_id,
      enrollment_date,
      attendance_percentage,
    ];

    await db1.execute(sql, values);
    res.status(201).json({ message: "Certificate added successfully" });
  } catch (error) {
    console.error("Error adding certificate:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// ✅ Get All Certificates (Only Admin)
export const getAllCertificates = async (req, res) => {
  try {
    verifyAdmin(req); // ✅ Check if the user is an admin

    const [certificates] = await db1.execute("SELECT * FROM certificates");

    if (certificates.length === 0) {
      return res.status(404).json({ error: "No certificates found" });
    }

    res.status(200).json({ certificates });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// ✅ Delete Certificate (Only Admin)
export const deleteCertificate = async (req, res) => {
  try {
    verifyAdmin(req); // ✅ Check if the user is an admin

    const { id } = req.params;

    // Check if the certificate exists
    const [certificate] = await db1.execute(
      "SELECT * FROM certificates WHERE id = ?",
      [id]
    );

    if (certificate.length === 0) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    // Delete the certificate image if it exists
    if (certificate[0].certificate_image) {
      const imagePath = path.join("images", certificate[0].certificate_image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    // Delete the certificate from the database
    await db1.execute("DELETE FROM certificates WHERE id = ?", [id]);

    res.status(200).json({ message: "Certificate deleted successfully" });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
export const updateCertificate = async (req, res) => {
  const { id } = req.params;
  let {
    student_name,
    course_name,
    course_hours,
    issue_date,
    assignment_percentage,
    attendance_percentage,
    trained_by,
    student_id,
    certificate_id,
    enrollment_date
  } = req.body;



  let certificate_image = req.file ? req.file.filename : null;

  try {
    const sql = `
      UPDATE certificates 
      SET student_name = ?, course_name = ?, course_hours = ?, 
          issue_date = ?, assignment_percentage = ?, attendance_percentage = ?, trained_by = ?, student_id = ?, certificate_id = ?, enrollment_date = ?,
          certificate_image = COALESCE(?, certificate_image)
      WHERE id = ?
    `;

    const [result] = await db1.execute(sql, [
      student_name,
      course_name,
      course_hours,
      issue_date,
      assignment_percentage,
      attendance_percentage,
         trained_by,
      student_id,
      certificate_id,
      enrollment_date,
   
      certificate_image,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Certificate not found or no changes made" });
    }

    return res
      .status(200)
      .json({ message: "Certificate updated successfully" });
  } catch (error) {
    console.error("❌ Error updating certificate:", error);
    return res
      .status(500)
      .json({ error: "Failed to update certificate. Please try again later." });
  }
};


export const getCertificateByCertificateId = async (req, res) => {
  try {
    const { certificate_id } = req.params;

    const [rows] = await db1.execute(
      `SELECT * FROM certificates WHERE certificate_id = ?`,
      [certificate_id]
    );

    if (rows.length === 0) {
      return res.status(405).json({ error: "Certificate not found" });
    }

    res.json(rows[0]); // Send certificate data
  } catch (error) {
    console.error("Error fetching certificate:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }

}