// backend/src/services/students.service.js
const { pool } = require("../db");

function mapStudentRow(row) {
  return {
    id: row.id,
    admissionNumber: row.admission_number,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString().slice(0, 10) : null,
    currentClass: row.current_class,
    currentSection: row.current_section,
    phoneNumber: row.phone_number,
    email: row.email,
    Place: row.place,
    fee: row.fee,
    fatherName: row.father_name,
  };
}

async function getAllStudents() {
  const result = await pool.query(
    `SELECT *
     FROM students
     ORDER BY
       CASE WHEN current_class IN ('LKG', 'UKG') THEN 0 ELSE 1 END,
       current_class,
       current_section,
       admission_number`
  );
  return result.rows.map(mapStudentRow);
}

async function createStudent(data) {
  const result = await pool.query(
    `INSERT INTO students (
       admission_number, first_name, last_name, gender, date_of_birth,
       current_class, current_section, phone_number, email, place, fee, father_name
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10, $11, $12
     )
     RETURNING *`,
    [
      data.admissionNumber,
      data.firstName,
      data.lastName,
      data.gender || null,
      data.dateOfBirth || null,
      data.currentClass,
      data.currentSection,
      data.phoneNumber || null,
      data.email || null,
      data.Place || null,
      data.fee || null,
      data.fatherName || null,
    ]
  );

  return mapStudentRow(result.rows[0]);
}

async function updateStudent(id, data) {
  const result = await pool.query(
    `UPDATE students SET
       admission_number = $1,
       first_name = $2,
       last_name = $3,
       gender = $4,
       date_of_birth = $5,
       current_class = $6,
       current_section = $7,
       phone_number = $8,
       email = $9,
       place = $10,
       fee = $11,
       father_name = $12,
       updated_at = NOW()
     WHERE id = $13
     RETURNING *`,
    [
      data.admissionNumber,
      data.firstName,
      data.lastName,
      data.gender || null,
      data.dateOfBirth || null,
      data.currentClass,
      data.currentSection,
      data.phoneNumber || null,
      data.email || null,
      data.Place || null,
      data.fee || null,
      data.fatherName || null,
      id,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapStudentRow(result.rows[0]);
}

async function deleteStudent(id) {
  await pool.query(`DELETE FROM students WHERE id = $1`, [id]);
}

module.exports = {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
