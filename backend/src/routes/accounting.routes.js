const express = require('express');
const router = express.Router();
const ctrl = require('../controller/accounting.controller');

router.post('/transactions', ctrl.createTransaction);
router.get('/transactions', ctrl.listTransactions);
router.get('/summary', ctrl.summary);

module.exports = router;
