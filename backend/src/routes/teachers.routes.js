// backend/src/routes/teachers.routes.js
const express = require("express");
const router = express.Router();
const teachersController = require("../controller/teachers.controller");

// Departments
router.get("/departments", teachersController.listDepartments);
router.post("/departments", teachersController.createDepartment);

// Teachers
router.get("/", teachersController.listTeachers);
router.post("/", teachersController.createTeacher);
router.put("/:id", teachersController.updateTeacher);
router.delete("/:id", teachersController.deleteTeacher);

module.exports = router;
