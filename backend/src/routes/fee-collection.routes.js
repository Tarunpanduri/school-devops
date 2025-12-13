// backend/src/routes/fee-collections.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/fee-collection.controller");
const auth = require("../middleware/auth.middleware");

// GET /fee-collections?studentId=...&academicYear=...
router.get("/", auth, controller.list);

// GET /fee-collections/summary?studentId=...&academicYear=...
router.get("/summary", auth, controller.summary);

// POST /fee-collections/collect
router.post("/collect", auth, controller.collect);

module.exports = router;
