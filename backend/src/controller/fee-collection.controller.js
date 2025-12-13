// backend/src/controller/fee-collection.controller.js
const service = require("../services/fee-collection.services");

async function collectFee(req, res) {
  try {
    const result = await service.collectFee(req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error("collectFee error:", err);
    res.status(500).json({ error: err.message || "Failed to collect fee" });
  }
}

async function getSummary(req, res) {
  const { studentId, academicYear } = req.query;

  if (!studentId || !academicYear) {
    return res.status(400).json({ error: "studentId and academicYear required" });
  }

  try {
    const summary = await service.getStudentFeeSummary(Number(studentId), academicYear);
    res.json({ summary });
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Failed to load summary" });
  }
}

async function listPayments(req, res) {
  const { studentId, academicYear } = req.query;

  if (!studentId || !academicYear) {
    return res.status(400).json({ error: "studentId and academicYear required" });
  }

  try {
    const payments = await service.getPaymentsByStudent(Number(studentId), academicYear);
    res.json({ payments });
  } catch (err) {
    console.error("listPayments error:", err);
    res.status(500).json({ error: "Failed to load payments" });
  }
}

module.exports = {
  collectFee,
  getSummary,
  listPayments,
};
