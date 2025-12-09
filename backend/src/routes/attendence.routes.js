// backend/src/routes/attendance.routes.js
const express = require("express");
const router = express.Router();
const attendanceController = require("../controller/attendence.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, attendanceController.getAttendance);
router.post("/submit", authMiddleware, attendanceController.submitAttendance);

module.exports = router;
