// backend/src/routes/homework.routes.js
const express = require("express");
const router = express.Router();
const homeworkController = require("../controller/homework.controller");
const authMiddleware = require("../middleware/auth.middleware");

// All routes protected
router.get("/", authMiddleware, homeworkController.listHomework);
router.post("/", authMiddleware, homeworkController.createHomework);
router.put("/:id", authMiddleware, homeworkController.updateHomework);
router.delete("/:id", authMiddleware, homeworkController.removeHomework);

module.exports = router;
