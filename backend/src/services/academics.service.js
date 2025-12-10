// backend/src/services/academics.service.js
const { pool } = require("../db");

async function getExams() {
  const result = await pool.query(
    `
    SELECT name
    FROM exam_names
    UNION
    SELECT DISTINCT exam_name AS name FROM exam_results
    ORDER BY name
    `
  );
  return result.rows.map(r => r.name);
}

async function createExam(name) {
  await pool.query(
    `INSERT INTO exam_names (name)
     VALUES ($1)
     ON CONFLICT (name) DO NOTHING`,
    [name]
  );
}

async function getClassSubjects(clazz) {
  const result = await pool.query(
    `SELECT name, default_max_marks
     FROM class_subjects
     WHERE class = $1 AND is_active = TRUE
     ORDER BY id`,
    [clazz]
  );
  return result.rows.map(r => ({
    name: r.name,
    defaultMaxMarks: r.default_max_marks,
  }));
}

async function getExamResult(examName, clazz, section, studentName) {
  const result = await pool.query(
    `SELECT subjects
     FROM exam_results
     WHERE exam_name   = $1
       AND class       = $2
       AND section     = $3
       AND student_name = $4
     LIMIT 1`,
    [examName, clazz, section, studentName]
  );

  if (result.rows.length === 0) {
    return [];
  }

  let subjects = result.rows[0].subjects;

  // subjects column is json/jsonb; pg usually parses to JS already.
  // But be defensive in case old data is stored as text.
  if (typeof subjects === "string") {
    try {
      subjects = JSON.parse(subjects);
    } catch (e) {
      console.error("Failed to parse subjects JSON from DB:", e);
      return [];
    }
  }

  // Some old rows may have { subjects: [...] }
  if (subjects && Array.isArray(subjects.subjects)) {
    return subjects.subjects;
  }

  if (Array.isArray(subjects)) {
    return subjects;
  }

  return [];
}

async function saveExamResult(examName, clazz, section, studentName, subjects) {
  // subjects is an array of objects coming from Angular
  // Convert ONCE to JSON string for Postgres jsonb
  const subjectsJson = JSON.stringify(subjects);

  const result = await pool.query(
    `INSERT INTO exam_results (exam_name, class, section, student_name, subjects)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (exam_name, class, section, student_name)
     DO UPDATE SET
       subjects   = EXCLUDED.subjects,
       updated_at = NOW()
     RETURNING subjects`,
    [examName, clazz, section, studentName, subjectsJson]
  );

  let saved = result.rows[0].subjects;

  if (typeof saved === "string") {
    try {
      saved = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved subjects JSON from DB:", e);
      return subjects; // fall back to what we received
    }
  }

  // Normalize
  if (saved && Array.isArray(saved.subjects)) {
    return saved.subjects;
  }

  if (Array.isArray(saved)) {
    return saved;
  }

  return [];
}

module.exports = {
  getExams,
  createExam,
  getClassSubjects,
  getExamResult,
  saveExamResult,
};
