// backend/src/services/teachersAttendance.service.js
const { pool } = require('../db');

/**
 * Get teacher attendance + submission counts for a department + month
 */
async function getTeacherAttendance(department, month) {
  const result = await pool.query(
    `SELECT attendance_data, submission_counts
     FROM teacher_attendance
     WHERE department = $1 AND month = $2`,
    [department, month]
  );

  if (result.rows.length === 0) {
    return {
      attendanceData: {},
      submissionCounts: {},
    };
  }

  const row = result.rows[0];
  return {
    attendanceData: row.attendance_data || {},
    submissionCounts: row.submission_counts || {},
  };
}

/**
 * Save / update teacher attendance for department+month.
 * Enforces max 2 submissions per day.
 */
async function saveTeacherAttendance(department, month, day, attendanceData) {
  // Load existing row (if any)
  const existing = await pool.query(
    `SELECT attendance_data, submission_counts
     FROM teacher_attendance
     WHERE department = $1 AND month = $2`,
    [department, month]
  );

  let submissionCounts = {};
  if (existing.rows.length > 0) {
    submissionCounts = existing.rows[0].submission_counts || {};
  }

  const dayKey = String(day);
  const currentCount = submissionCounts[dayKey] || 0;

  if (currentCount >= 2) {
    const err = new Error('Daily submission limit reached');
    err.code = 'LIMIT_REACHED';
    throw err;
  }

  const updatedCounts = {
    ...submissionCounts,
    [dayKey]: currentCount + 1,
  };

  // Merge existing attendance data with new data
  let finalAttendanceData = {};
  if (existing.rows.length > 0 && existing.rows[0].attendance_data) {
    finalAttendanceData = { ...existing.rows[0].attendance_data };
  }
  
  // Update with new attendance data
  Object.keys(attendanceData).forEach(teacherId => {
    const teacherIdNum = parseInt(teacherId);
    if (!finalAttendanceData[teacherIdNum]) {
      finalAttendanceData[teacherIdNum] = {};
    }
    finalAttendanceData[teacherIdNum][day] = attendanceData[teacherIdNum][day];
  });

  // Upsert
  const upsert = await pool.query(
    `INSERT INTO teacher_attendance (department, month, attendance_data, submission_counts)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (department, month)
     DO UPDATE SET
       attendance_data = EXCLUDED.attendance_data,
       submission_counts = EXCLUDED.submission_counts,
       updated_at = NOW()
     RETURNING attendance_data, submission_counts`,
    [department, month, finalAttendanceData, updatedCounts]
  );

  const row = upsert.rows[0];

  return {
    attendanceData: row.attendance_data || {},
    submissionCounts: row.submission_counts || {},
  };
}

module.exports = {
  getTeacherAttendance,
  saveTeacherAttendance,
};