// backend/src/services/teachers.service.js
const { pool } = require("../db");

// ---------- DEPARTMENTS ----------

async function getDepartments() {
  const result = await pool.query(
    `SELECT name
     FROM teacher_departments
     ORDER BY name`
  );
  return result.rows.map(r => r.name);
}

async function addDepartment(name) {
  const result = await pool.query(
    `INSERT INTO teacher_departments (name)
     VALUES ($1)
     ON CONFLICT (name) DO NOTHING
     RETURNING name`,
    [name]
  );

  // If conflict and row existed, there might be no RETURNING row
  if (result.rows.length > 0) {
    return result.rows[0].name;
  }
  return name;
}

// ---------- TEACHERS ----------

async function getTeachers() {
  const result = await pool.query(
    `SELECT
      id,
      teacher_id,
      first_name,
      last_name,
      gender,
      date_of_birth,
      joining_date,
      department,
      phone,
      email,
      address,

      designation,
      bank_name,
      bank_account,
      bank_ifsc,
      pan,
      uan,
      pf_number,

      basic_salary,
      allowance,
      deductions
     FROM teachers
     ORDER BY teacher_id`
  );

  return result.rows.map(r => ({
    id: r.id,
    teacherId: r.teacher_id,
    firstName: r.first_name,
    lastName: r.last_name,
    gender: r.gender,
    dateOfBirth: r.date_of_birth,
    joiningDate: r.joining_date,
    department: r.department,
    phone: r.phone,
    email: r.email,
    address: r.address,

    designation: r.designation,
    bankName: r.bank_name,
    bankAccount: r.bank_account,
    bankIfsc: r.bank_ifsc,
    pan: r.pan,
    uan: r.uan,
    pfNumber: r.pf_number,

    basicSalary: Number(r.basic_salary || 0),
    allowance: Number(r.allowance || 0),
    deductions: Number(r.deductions || 0),
  }));
}

async function createTeacher(t) {
  const result = await pool.query(
    `INSERT INTO teachers (
       teacher_id,
       first_name,
       last_name,
       gender,
       date_of_birth,
       joining_date,
       department,
       phone,
       email,
       address
     )
     VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10)
     RETURNING
       id,
       teacher_id,
       first_name,
       last_name,
       gender,
       date_of_birth,
       joining_date,
       department,
       phone,
       email,
       address`,
    [
      t.teacherId,
      t.firstName,
      t.lastName,
      t.gender,
      t.dateOfBirth || null,
      t.joiningDate || null,
      t.department,
      t.phone || null,
      t.email || null,
      t.address || null,
    ]
  );

  const r = result.rows[0];
  return {
    id: r.id,
    teacherId: r.teacher_id,
    firstName: r.first_name,
    lastName: r.last_name,
    gender: r.gender,
    dateOfBirth: r.date_of_birth,
    joiningDate: r.joining_date,
    department: r.department,
    phone: r.phone,
    email: r.email,
    address: r.address,
  };
}

async function createTeacher(t) {
  const result = await pool.query(
    `INSERT INTO teachers (
      teacher_id, first_name, last_name, gender,
      date_of_birth, joining_date, department,
      phone, email, address,
      designation, bank_name, bank_account, bank_ifsc,
      pan, uan, pf_number,
      basic_salary, allowance, deductions
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,
      $11,$12,$13,$14,
      $15,$16,$17,
      $18,$19,$20
    )
    RETURNING *`,
    [
      t.teacherId,
      t.firstName,
      t.lastName,
      t.gender,
      t.dateOfBirth || null,
      t.joiningDate || null,
      t.department,
      t.phone || null,
      t.email || null,
      t.address || null,

      t.designation || null,
      t.bankName || null,
      t.bankAccount || null,
      t.bankIfsc || null,
      t.pan || null,
      t.uan || null,
      t.pfNumber || null,

      t.basicSalary || 0,
      t.allowance || 0,
      t.deductions || 0,
    ]
  );

  return result.rows[0];
}


async function updateTeacher(id, t) {
  const result = await pool.query(
    `UPDATE teachers SET
      teacher_id=$1, first_name=$2, last_name=$3, gender=$4,
      date_of_birth=$5::date, joining_date=$6::date, department=$7,
      phone=$8, email=$9, address=$10,
      designation=$11, bank_name=$12, bank_account=$13, bank_ifsc=$14,
      pan=$15, uan=$16, pf_number=$17,
      basic_salary=$18, allowance=$19, deductions=$20,
      updated_at=NOW()
     WHERE id=$21 RETURNING *`,
    [
      t.teacherId, t.firstName, t.lastName, t.gender,
      t.dateOfBirth || null, t.joiningDate || null, t.department,
      t.phone || null, t.email || null, t.address || null,

      t.designation || null, t.bankName || null, t.bankAccount || null, t.bankIfsc || null,
      t.pan || null, t.uan || null, t.pfNumber || null,

      t.basicSalary || 0, t.allowance || 0, t.deductions || 0,
      id,
    ]
  );

  return result.rows[0];
}


async function deleteTeacher(id) {
  await pool.query(
    `DELETE FROM teachers
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  getDepartments,
  addDepartment,
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
