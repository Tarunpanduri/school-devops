const express = require("express");
const router = express.Router();
const authController = require("../controller/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public route: login
router.post("/login", authController.login);

// Protected route: get current user
router.get("/me", authMiddleware, authController.me);

module.exports = router;
