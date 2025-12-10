// backend/src/routes/teachersAttendance.routes.js
const express = require('express');
const router = express.Router();
const teachersAttendanceController = require('../controller/teachersAttendence.controller');

router.get('/', teachersAttendanceController.getTeacherAttendance);
router.post('/', teachersAttendanceController.saveTeacherAttendance);

module.exports = router;