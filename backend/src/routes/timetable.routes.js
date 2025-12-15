const express = require("express");
const router = express.Router();
const controller = require("../controller/timetable.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, controller.getTimetable);

module.exports = router;
