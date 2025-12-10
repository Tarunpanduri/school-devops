// backend/src/controllers/academics.controller.js
const academicsService = require("../services/academics.service");
const { pool } = require("../db");

// ---------- EXAMS ----------
async function listExams(req, res) {
  try {
    const exams = await academicsService.getExams();
    res.json({ exams });
  } catch (err) {
    console.error("listExams error:", err);
    res.status(500).json({ error: "Failed to load exams" });
  }
}

async function createExam(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    await academicsService.createExam(name);
    res.status(201).json({ message: "Exam created" });
  } catch (err) {
    console.error("createExam error:", err);
    res.status(500).json({ error: "Failed to create exam" });
  }
}

// ---------- CLASS SUBJECTS ----------
async function listClassSubjects(req, res) {
  const { class: clazz } = req.query;
  if (!clazz) {
    return res.status(400).json({ error: "class is required" });
  }

  try {
    const subjects = await academicsService.getClassSubjects(clazz);
    res.json({ subjects });
  } catch (err) {
    console.error("listClassSubjects error:", err);
    res.status(500).json({ error: "Failed to load subjects" });
  }
}

// ---------- EXAM RESULTS ----------
async function getExamResult(req, res) {
  const { exam, class: clazz, section, studentName } = req.query;

  if (!exam || !clazz || !section || !studentName) {
    return res.status(400).json({
      error: "exam, class, section and studentName are required",
    });
  }

  try {
    const subjects = await academicsService.getExamResult(
      exam,
      clazz,
      section,
      studentName
    );
    res.json({ subjects: subjects || [] });
  } catch (err) {
    console.error("getExamResult error:", err);
    res.status(500).json({ error: "Failed to load exam result" });
  }
}

async function saveExamResult(req, res) {
  const { exam, class: clazz, section, studentName, subjects } = req.body;

  if (!exam || !clazz || !section || !studentName || !subjects) {
    return res.status(400).json({
      error: "exam, class, section, studentName and subjects are required",
    });
  }

  try {
    const saved = await academicsService.saveExamResult(
      exam,
      clazz,
      section,
      studentName,
      subjects
    );
    res.json({ subjects: saved });
  } catch (err) {
    console.error("saveExamResult error:", err);
    res.status(500).json({ error: "Failed to save exam result" });
  }
}

// ---------- STUDENTS FOR CLASS+SECTION (DROPDOWN) ----------
async function listStudentsForClassSection(req, res) {
  const { class: clazz, section } = req.query;

  if (!clazz || !section) {
    return res.status(400).json({ error: "class and section are required" });
  }

  try {
    const result = await pool.query(
      `SELECT first_name, last_name
       FROM students
       WHERE current_class = $1 AND current_section = $2
       ORDER BY admission_number`,
      [clazz, section]
    );

    const students = result.rows.map(r =>
      `${r.first_name} ${r.last_name}`.trim()
    );

    res.json({ students });
  } catch (err) {
    console.error("listStudentsForClassSection error:", err);
    res.status(500).json({ error: "Failed to load students" });
  }
}

// ---------- SCHOOL PROFILE ----------
async function getSchoolProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT name, address, city, state, exam_header
       FROM school_profile
       ORDER BY id
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Fallback if no row yet
      return res.json({
        name: "School Name",
        address: "",
        city: "",
        state: "",
        examHeader: "School Examination",
      });
    }

    const row = result.rows[0];
    res.json({
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      examHeader: row.exam_header,
    });
  } catch (err) {
    console.error("getSchoolProfile error:", err);
    res.status(500).json({ error: "Failed to load school profile" });
  }
}

module.exports = {
  listExams,
  createExam,
  listClassSubjects,
  getExamResult,
  saveExamResult,
  listStudentsForClassSection,
  getSchoolProfile,
};
