// backend/src/controllers/attendance.controller.js
const attendanceService = require("../services/attendence.services");

async function getAttendance(req, res) {
  const { grade, month } = req.query;

  if (!grade || !month) {
    return res.status(400).json({ error: "grade and month are required" });
  }

  try {
    const result = await attendanceService.getAttendance(grade, month);
    res.json(result);
  } catch (err) {
    console.error("getAttendance error:", err);
    res.status(500).json({ error: "Failed to load attendance" });
  }
}

async function submitAttendance(req, res) {
  const { grade, month, attendanceData, todayDay } = req.body;

  if (!grade || !month || !attendanceData || !todayDay) {
    return res.status(400).json({
      error: "grade, month, attendanceData, todayDay are required",
    });
  }

  try {
    const result = await attendanceService.submitAttendance(
      grade,
      month,
      attendanceData,
      todayDay
    );
    res.json({
      message:
        result.submissionCountToday === 1
          ? "Attendance submitted successfully."
          : "Attendance updated successfully. (Final chance)",
      ...result,
    });
  } catch (err) {
    if (err.code === "SUBMISSION_LIMIT_REACHED") {
      return res.status(429).json({
        error: "Attendance already submitted twice for today.",
      });
    }
    console.error("submitAttendance error:", err);
    res.status(500).json({ error: "Failed to submit attendance" });
  }
}

module.exports = {
  getAttendance,
  submitAttendance,
};
