// backend/src/controllers/salaries.controller.js
const salariesService = require('../services/salaries.services');

/**
 * GET /salaries?month=YYYY-MM&department=Maths (department optional)
 */
async function listSalaries(req, res) {
  const { month, department } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'month is required (YYYY-MM)' });
  }

  try {
    const rows = await salariesService.listSalaries(month, department || null);

    const teachers = rows.map(r => ({
      id: r.id,
      teacherId: r.teacher_id,
      fullName: `${r.first_name} ${r.last_name}`.trim(),
      department: r.department,
      designation: r.designation || null,
      joiningDate: r.joining_date,
      basicSalary: Number(r.basic_salary || 0),
      allowance: Number(r.allowance || 0),
      deductions: Number(r.deductions || 0),
      netSalary: Number(r.net_salary || 0),
      bankName: r.bank_name || null,
      bankAccount: r.bank_account || null,
      bankIfsc: r.bank_ifsc || null,
      pan: r.pan || null,
      uan: r.uan || null,
      pfNumber: r.pf_number || null,
    }));

    res.json({
      month,
      department: department || null,
      teachers,
    });
  } catch (err) {
    console.error('listSalaries error:', err);
    res.status(500).json({ error: 'Failed to load salaries' });
  }
}

/**
 * POST /salaries
 * body: { teacherId, month, basicSalary, allowance, deductions }
 */
async function saveTeacherSalary(req, res) {
  const { teacherId, month, basicSalary, allowance, deductions } = req.body;

  if (!teacherId || !month) {
    return res.status(400).json({
      error: 'teacherId and month are required',
    });
  }

  try {
    const saved = await salariesService.saveSalary(
      teacherId,
      month,
      basicSalary,
      allowance,
      deductions
    );

    res.json({
      message: 'Salary saved successfully',
      salary: {
        id: saved.id,
        teacherId: saved.teacher_id,
        month: saved.month,
        basicSalary: Number(saved.basic_salary || 0),
        allowance: Number(saved.allowance || 0),
        deductions: Number(saved.deductions || 0),
        netSalary: Number(saved.net_salary || 0),
      },
    });
  } catch (err) {
    console.error('saveTeacherSalary error:', err);
    res.status(500).json({ error: 'Failed to save salary' });
  }
}

module.exports = {
  listSalaries,
  saveTeacherSalary,
};
