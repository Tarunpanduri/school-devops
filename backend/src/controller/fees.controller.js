// backend/src/controllers/fees.controller.js
const feesService = require("../services/fees.services");

async function listAcademicYears(req, res) {
  try {
    const years = await feesService.getAcademicYears();
    res.json({ years });
  } catch (err) {
    console.error("listAcademicYears error:", err);
    res.status(500).json({ error: "Failed to load academic years" });
  }
}

async function listFees(req, res) {
  const { academicYear, class: clazz } = req.query;

  if (!academicYear || !clazz) {
    return res
      .status(400)
      .json({ error: "academicYear and class are required" });
  }

  try {
    const fees = await feesService.getFeesByYearAndClass(academicYear, clazz);
    res.json({ fees });
  } catch (err) {
    console.error("listFees error:", err);
    res.status(500).json({ error: "Failed to load fees" });
  }
}

async function createFee(req, res) {
  const { academicYear, class: clazz, fee } = req.body;

  if (!academicYear || !clazz || !fee) {
    return res
      .status(400)
      .json({ error: "academicYear, class and fee are required" });
  }

  try {
    const created = await feesService.createFee(academicYear, clazz, fee);
    res.status(201).json({ fee: created });
  } catch (err) {
    console.error("createFee error:", err);
    res.status(500).json({ error: "Failed to create fee" });
  }
}

async function updateFee(req, res) {
  const id = Number(req.params.id);
  const { fee } = req.body;

  if (!id || !fee) {
    return res.status(400).json({ error: "id and fee are required" });
  }

  try {
    const updated = await feesService.updateFee(id, fee);
    if (!updated) {
      return res.status(404).json({ error: "Fee not found" });
    }
    res.json({ fee: updated });
  } catch (err) {
    console.error("updateFee error:", err);
    res.status(500).json({ error: "Failed to update fee" });
  }
}

async function removeFee(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    await feesService.deleteFee(id);
    res.status(204).send();
  } catch (err) {
    console.error("removeFee error:", err);
    res.status(500).json({ error: "Failed to delete fee" });
  }
}

module.exports = {
  listAcademicYears,
  listFees,
  createFee,
  updateFee,
  removeFee,
};
