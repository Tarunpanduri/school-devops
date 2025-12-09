// backend/src/services/attendance.service.js
const { pool } = require("../db");

async function getAttendance(grade, month) {
  const result = await pool.query(
    `SELECT data, submission_counts
     FROM attendance_snapshots
     WHERE grade = $1 AND month = $2`,
    [grade, month]
  );

  if (result.rows.length === 0) {
    return {
      attendanceData: {},
      submissionCounts: {},
    };
  }

  const row = result.rows[0];
  return {
    attendanceData: row.data || {},
    submissionCounts: row.submission_counts || {},
  };
}

async function submitAttendance(grade, month, attendanceData, todayDay) {
  const todayKey = String(todayDay);

  const existing = await pool.query(
    `SELECT data, submission_counts
     FROM attendance_snapshots
     WHERE grade = $1 AND month = $2`,
    [grade, month]
  );

  let submissionCounts = {};
  if (existing.rows.length > 0) {
    submissionCounts = existing.rows[0].submission_counts || {};
  }

  const currentCount = submissionCounts[todayKey] || 0;
  if (currentCount >= 2) {
    const err = new Error("SUBMISSION_LIMIT_REACHED");
    err.code = "SUBMISSION_LIMIT_REACHED";
    throw err;
  }

  const newCount = currentCount + 1;
  submissionCounts[todayKey] = newCount;

  const upsertResult = await pool.query(
    `INSERT INTO attendance_snapshots (grade, month, data, submission_counts)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (grade, month)
     DO UPDATE SET
       data = EXCLUDED.data,
       submission_counts = EXCLUDED.submission_counts,
       updated_at = NOW()
     RETURNING data, submission_counts`,
    [grade, month, attendanceData, submissionCounts]
  );

  const row = upsertResult.rows[0];
  return {
    attendanceData: row.data || {},
    submissionCounts: row.submission_counts || {},
    submissionCountToday: newCount,
  };
}

module.exports = {
  getAttendance,
  submitAttendance,
};
