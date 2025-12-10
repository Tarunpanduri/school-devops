// backend/src/controllers/teachersAttendance.controller.js
const teachersAttendanceService = require('../services/teachersAttendence.services');

async function getTeacherAttendance(req, res) {
  const { department, month } = req.query;

  if (!department || !month) {
    return res.status(400).json({ error: 'department and month are required' });
  }

  try {
    const { attendanceData, submissionCounts } =
      await teachersAttendanceService.getTeacherAttendance(department, month);

    res.json({ attendanceData, submissionCounts });
  } catch (err) {
    console.error('getTeacherAttendance error:', err);
    res.status(500).json({ error: 'Failed to load teacher attendance' });
  }
}

// POST /api/teachers-attendance
// body: { department, month, day, attendanceData }
async function saveTeacherAttendance(req, res) {
  const { department, month, day, attendanceData } = req.body;

  if (!department || !month || !day || !attendanceData) {
    return res.status(400).json({
      error: 'department, month, day and attendanceData are required',
    });
  }

  try {
    const { attendanceData: savedAttendance, submissionCounts } =
      await teachersAttendanceService.saveTeacherAttendance(
        department,
        month,
        day,
        attendanceData
      );

    res.json({
      message: 'Teacher attendance saved successfully',
      attendanceData: savedAttendance,
      submissionCounts,
    });
  } catch (err) {
    if (err.code === 'LIMIT_REACHED') {
      return res.status(429).json({
        error:
          'Attendance has already been submitted twice today for this department.',
      });
    }

    console.error('saveTeacherAttendance error:', err);
    res.status(500).json({ error: 'Failed to save teacher attendance' });
  }
}

module.exports = {
  getTeacherAttendance,
  saveTeacherAttendance,
};