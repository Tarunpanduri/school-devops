// backend/src/services/classes.service.js
const { pool } = require("../db");

async function getClasses() {
  const result = await pool.query(
    "SELECT DISTINCT current_class FROM students ORDER BY current_class"
  );
  return result.rows.map(r => r.current_class);
}

async function getSectionsByClass(currentClass) {
  const result = await pool.query(
    "SELECT DISTINCT current_section FROM students WHERE current_class = $1 ORDER BY current_section",
    [currentClass]
  );
  return result.rows.map(r => r.current_section);
}

module.exports = {
  getClasses,
  getSectionsByClass,
};
