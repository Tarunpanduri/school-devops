// backend/src/controllers/students.controller.js
const studentsService = require("../services/studends.services");

async function listStudents(req, res) {
  try {
    const students = await studentsService.getAllStudents();
    res.json({ students });
  } catch (err) {
    console.error("listStudents error:", err);
    res.status(500).json({ error: "Failed to load students" });
  }
}

async function createStudent(req, res) {
  try {
    const student = await studentsService.createStudent(req.body);
    res.status(201).json({ student });
  } catch (err) {
    console.error("createStudent error:", err);
    res.status(500).json({ error: "Failed to create student" });
  }
}

async function updateStudent(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const student = await studentsService.updateStudent(id, req.body);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json({ student });
  } catch (err) {
    console.error("updateStudent error:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
}

async function removeStudent(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    await studentsService.deleteStudent(id);
    res.status(204).send();
  } catch (err) {
    console.error("removeStudent error:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
}

module.exports = {
  listStudents,
  createStudent,
  updateStudent,
  removeStudent,
};
