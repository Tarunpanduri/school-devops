// backend/src/controller/fee-collection.controller.js
const service = require("../services/fee-collection.services");

async function collect(req, res) {
  try {
    const saved = await service.collectFee(req.body, req.user);
    return res.status(201).json({ payment: saved });
  } catch (err) {
    console.error("fee-collection.collect error:", err);
    if (err.code === "BAD_INPUT") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    // Handle unique constraint violation for receipt_no
    if (err.code === '23505' && err.constraint === 'fee_collections_receipt_no_key') {
      return res.status(409).json({ error: "Receipt number conflict, please try again" });
    }
    return res.status(500).json({ error: "Failed to collect fee" });
  }
}

async function list(req, res) {
  const { studentId, academicYear } = req.query;
  if (!studentId || !academicYear) {
    return res.status(400).json({ error: "studentId and academicYear required" });
  }

  try {
    const payments = await service.getPayments(studentId, academicYear);
    return res.json({ payments });
  } catch (err) {
    console.error("fee-collection.list error:", err);
    if (err.code === "BAD_INPUT") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to load payments" });
  }
}

async function summary(req, res) {
  const { studentId, academicYear } = req.query;
  if (!studentId || !academicYear) {
    return res.status(400).json({ error: "studentId and academicYear required" });
  }

  try {
    const summary = await service.getStudentFeeSummary(studentId, academicYear);
    return res.json({ summary });
  } catch (err) {
    console.error("fee-collection.summary error:", err);
    if (err.code === "BAD_INPUT") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to load summary" });
  }
}

module.exports = {
  collect,
  list,
  summary,
};