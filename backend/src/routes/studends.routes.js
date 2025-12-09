// backend/src/routes/students.routes.js
const express = require("express");
const router = express.Router();
const studentsController = require("../controller/studends.contoller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, studentsController.listStudents);
router.post("/", authMiddleware, studentsController.createStudent);
router.put("/:id", authMiddleware, studentsController.updateStudent);
router.delete("/:id", authMiddleware, studentsController.removeStudent);

module.exports = router;
