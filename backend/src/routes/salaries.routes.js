// backend/src/routes/salaries.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/salaries.controller');

router.get('/', ctrl.listSalaries);
router.post('/', ctrl.saveTeacherSalary);

module.exports = router;
