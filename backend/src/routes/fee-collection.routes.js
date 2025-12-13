const express = require("express");
const router = express.Router();
const controller = require("../controller/fee-collection.controller");
const auth = require("../middleware/auth.middleware");

router.post("/collect", auth, controller.collectFee);
router.get("/summary", auth, controller.getSummary);
router.get("/", auth, controller.listPayments);

module.exports = router;
