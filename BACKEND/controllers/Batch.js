// controllers/batchesController.js
import db1 from "../db1.js";

// ✅ Get all batches
export const getBatches = async (req, res) => {
  try {
    const [rows] = await db1.query("SELECT * FROM batches ORDER BY id DESC");
    res.json({ success: true, batches: rows });
  } catch (err) {
    console.error("Error fetching batches:", err);
    res.status(500).json({ success: false, error: "Failed to fetch batches" });
  }
};

// ✅ Add new batch
export const addBatch = async (req, res) => {
  try {
    const { batch_name, created_by } = req.body;
    if (!batch_name) {
      return res.status(400).json({ success: false, error: "Batch name is required" });
    }

    await db1.query(
      "INSERT INTO batches (batch_name, created_by, created_date) VALUES (?, ?, NOW())",
      [batch_name, created_by || 1]
    );

    res.json({ success: true, message: "Batch added successfully" });
  } catch (err) {
    console.error("Error adding batch:", err);
    res.status(500).json({ success: false, error: "Failed to add batch" });
  }
};

// ✅ Update existing batch
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_name } = req.body;

    await db1.query("UPDATE batches SET batch_name = ? WHERE id = ?", [batch_name, id]);

    res.json({ success: true, message: "Batch updated successfully" });
  } catch (err) {
    console.error("Error updating batch:", err);
    res.status(500).json({ success: false, error: "Failed to update batch" });
  }
};

// ✅ Delete batch
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    await db1.query("DELETE FROM batches WHERE id = ?", [id]);

    res.json({ success: true, message: "Batch deleted successfully" });
  } catch (err) {
    console.error("Error deleting batch:", err);
    res.status(500).json({ success: false, error: "Failed to delete batch" });
  }
};
