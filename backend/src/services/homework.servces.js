// backend/src/services/homework.service.js
const { pool } = require("../db");

function mapHomeworkRow(row) {
  return {
    id: row.id,
    class: row.class,
    section: row.section,
    subject: row.subject,
    task: row.task,
    assignedDate: row.assigned_date
      ? row.assigned_date.toISOString().slice(0, 10)
      : null,
    dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
  };
}

async function getHomeworkByClassSectionDate(clazz, section, date) {
  const result = await pool.query(
    `SELECT *
     FROM homeworks
     WHERE class = $1 AND section = $2 AND assigned_date = $3
     ORDER BY id`,
    [clazz, section, date]
  );

  return result.rows.map(mapHomeworkRow);
}

async function createHomework(clazz, section, data) {
  const result = await pool.query(
    `INSERT INTO homeworks (
       class, section, subject, task, assigned_date, due_date
     ) VALUES (
       $1, $2, $3, $4, $5, $6
     )
     RETURNING *`,
    [
      clazz,
      section,
      data.subject,
      data.task,
      data.assignedDate,
      data.dueDate || null,
    ]
  );

  return mapHomeworkRow(result.rows[0]);
}

async function updateHomework(id, data) {
  const result = await pool.query(
    `UPDATE homeworks SET
       subject = $1,
       task = $2,
       assigned_date = $3,
       due_date = $4,
       updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      data.subject,
      data.task,
      data.assignedDate,
      data.dueDate || null,
      id,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return mapHomeworkRow(result.rows[0]);
}

async function deleteHomework(id) {
  await pool.query(`DELETE FROM homeworks WHERE id = $1`, [id]);
}

module.exports = {
  getHomeworkByClassSectionDate,
  createHomework,
  updateHomework,
  deleteHomework,
};
