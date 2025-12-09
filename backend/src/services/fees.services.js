// backend/src/services/fees.service.js
const { pool } = require("../db");

function mapFeeRow(row) {
  return {
    id: row.id,
    academicYear: row.academic_year,
    class: row.class,
    category: row.category,
    description: row.description,
    frequency: row.frequency,
    amount: Number(row.amount),
  };
}

async function getAcademicYears() {
  const result = await pool.query(
    `SELECT DISTINCT academic_year
     FROM fee_structures
     ORDER BY academic_year`
  );
  return result.rows.map(r => r.academic_year);
}

async function getFeesByYearAndClass(academicYear, clazz) {
  const result = await pool.query(
    `SELECT *
     FROM fee_structures
     WHERE academic_year = $1 AND class = $2
     ORDER BY id`,
    [academicYear, clazz]
  );
  return result.rows.map(mapFeeRow);
}

async function createFee(academicYear, clazz, data) {
  const result = await pool.query(
    `INSERT INTO fee_structures (
       academic_year, class, category, description, frequency, amount
     ) VALUES (
       $1, $2, $3, $4, $5, $6
     )
     RETURNING *`,
    [
      academicYear,
      clazz,
      data.category,
      data.description || null,
      data.frequency || null,
      data.amount,
    ]
  );
  return mapFeeRow(result.rows[0]);
}

async function updateFee(id, data) {
  const result = await pool.query(
    `UPDATE fee_structures SET
       category = $1,
       description = $2,
       frequency = $3,
       amount = $4,
       updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      data.category,
      data.description || null,
      data.frequency || null,
      data.amount,
      id,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return mapFeeRow(result.rows[0]);
}

async function deleteFee(id) {
  await pool.query(`DELETE FROM fee_structures WHERE id = $1`, [id]);
}

module.exports = {
  getAcademicYears,
  getFeesByYearAndClass,
  createFee,
  updateFee,
  deleteFee,
};
