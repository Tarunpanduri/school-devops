// backend/src/controllers/teachers.controller.js
const teachersService = require("../services/teachers.services");

// ---------- DEPARTMENTS ----------

async function listDepartments(req, res) {
  try {
    const departments = await teachersService.getDepartments();
    res.json({ departments });
  } catch (err) {
    console.error("listDepartments error:", err);
    res.status(500).json({ error: "Failed to load departments" });
  }
}

async function createDepartment(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const savedName = await teachersService.addDepartment(name.trim());
    res.status(201).json({ name: savedName });
  } catch (err) {
    console.error("createDepartment error:", err);
    res.status(500).json({ error: "Failed to create department" });
  }
}

// ---------- TEACHERS ----------

async function listTeachers(req, res) {
  try {
    const teachers = await teachersService.getTeachers();
    res.json({ teachers });
  } catch (err) {
    console.error("listTeachers DB error:", err);
    res.status(500).json({
      error: "Failed to load teachers",
      details: err.message
    });
  }
}


async function createTeacher(req, res) {
  const body = req.body;

  if (!body.teacherId || !body.firstName || !body.lastName || !body.gender || !body.department) {
    return res.status(400).json({
      error: "teacherId, firstName, lastName, gender and department are required",
    });
  }

  try {
    const teacher = await teachersService.createTeacher(body);
    res.status(201).json({ teacher });
  } catch (err) {
    console.error("createTeacher error:", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
}

async function updateTeacher(req, res) {
  const { id } = req.params;
  const body = req.body;

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const updated = await teachersService.updateTeacher(id, body);
    if (!updated) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json({ teacher: updated });
  } catch (err) {
    console.error("updateTeacher error:", err);
    res.status(500).json({ error: "Failed to update teacher" });
  }
}

async function deleteTeacher(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    await teachersService.deleteTeacher(id);
    res.status(204).send();
  } catch (err) {
    console.error("deleteTeacher error:", err);
    res.status(500).json({ error: "Failed to delete teacher" });
  }
}

module.exports = {
  listDepartments,
  createDepartment,
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
