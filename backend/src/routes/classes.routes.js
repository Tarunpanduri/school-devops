// backend/src/routes/classes.routes.js
const express = require("express");
const router = express.Router();
const classesController = require("../controller/classes.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, classesController.listClasses);
router.get("/:class/sections", authMiddleware, classesController.listSections);

module.exports = router;
