// backend/src/services/salaries.service.js
const { pool } = require('../db');

/**
 * List salaries for a given month (and optional department).
 */
async function listSalaries(month, department) {
  const params = [month];
  let deptFilter = '';

  if (department) {
    deptFilter = 'AND t.department = $2';
    params.push(department);
  }

  const result = await pool.query(
    `
    SELECT
      t.id,
      t.teacher_id,
      t.first_name,
      t.last_name,
      t.department,
      t.joining_date,
      t.designation,
      t.bank_name,
      t.bank_account,
      t.bank_ifsc,
      t.pan,
      t.uan,
      t.pf_number,
      COALESCE(s.basic_salary, 0)  AS basic_salary,
      COALESCE(s.allowance, 0)     AS allowance,
      COALESCE(s.deductions, 0)    AS deductions,
      COALESCE(s.net_salary, 0)    AS net_salary
    FROM teachers t
    LEFT JOIN teacher_salaries s
      ON s.teacher_id = t.id
     AND s.month = $1
    WHERE 1=1
      ${deptFilter}
    ORDER BY t.teacher_id
    `,
    params
  );

  return result.rows;
}

/**
 * Upsert teacher salary for month.
 */
async function saveSalary(teacherId, month, basicSalary, allowance, deductions) {
  const basic = Number(basicSalary || 0);
  const allo  = Number(allowance || 0);
  const ded   = Number(deductions || 0);
  const net   = basic + allo - ded;

  const result = await pool.query(
    `
    INSERT INTO teacher_salaries
      (teacher_id, month, basic_salary, allowance, deductions, net_salary)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (teacher_id, month)
    DO UPDATE SET
      basic_salary = EXCLUDED.basic_salary,
      allowance    = EXCLUDED.allowance,
      deductions   = EXCLUDED.deductions,
      net_salary   = EXCLUDED.net_salary,
      updated_at   = NOW()
    RETURNING
      id,
      teacher_id,
      month,
      basic_salary,
      allowance,
      deductions,
      net_salary
    `,
    [teacherId, month, basic, allo, ded, net]
  );

  return result.rows[0];
}

module.exports = {
  listSalaries,
  saveSalary,
};
