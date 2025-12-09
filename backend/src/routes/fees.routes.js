// backend/src/routes/fees.routes.js
const express = require("express");
const router = express.Router();
const feesController = require("../controller/fees.controller");
const authMiddleware = require("..//middleware/auth.middleware");

// All routes protected
router.get("/years", authMiddleware, feesController.listAcademicYears);
router.get("/", authMiddleware, feesController.listFees);
router.post("/", authMiddleware, feesController.createFee);
router.put("/:id", authMiddleware, feesController.updateFee);
router.delete("/:id", authMiddleware, feesController.removeFee);

module.exports = router;
