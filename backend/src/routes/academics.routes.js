// backend/src/routes/academics.routes.js
const express = require("express");
const router = express.Router();
const academicsController = require("../controller/academics.controllers");
const authMiddleware = require("../middleware/auth.middleware");

// All protected
router.get("/exams", authMiddleware, academicsController.listExams);
router.post("/exams", authMiddleware, academicsController.createExam);

router.get("/subjects", authMiddleware, academicsController.listClassSubjects);

router.get("/results", authMiddleware, academicsController.getExamResult);
router.post("/results", authMiddleware, academicsController.saveExamResult);

router.get(
  "/students",
  authMiddleware,
  academicsController.listStudentsForClassSection
);

// new: school profile
router.get(
  "/school-profile",
  authMiddleware,
  academicsController.getSchoolProfile
);

module.exports = router;
