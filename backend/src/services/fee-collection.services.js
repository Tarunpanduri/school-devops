// backend/src/services/fee-collection.services.js
const { pool } = require("../db");

/* ---------- HELPERS ---------- */

async function calculateTotalFee(studentId, academicYear) {
  const studentRes = await pool.query(
    `SELECT current_class FROM students WHERE id = $1`,
    [studentId]
  );

  if (!studentRes.rows.length) {
    throw new Error("Student not found");
  }

  const clazz = studentRes.rows[0].current_class;

  const feeRes = await pool.query(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM fee_structures
    WHERE academic_year = $1 AND class = $2
    `,
    [academicYear, clazz]
  );

  return Number(feeRes.rows[0].total);
}

/* ---------- SUMMARY UPSERT ---------- */

async function upsertFeeSummary(client, studentId, academicYear) {
  const totalFee = await calculateTotalFee(studentId, academicYear);

  const paidRes = await client.query(
    `
    SELECT COALESCE(SUM(paid_amount), 0) AS paid
    FROM fee_collections
    WHERE student_id = $1 AND academic_year = $2
    `,
    [studentId, academicYear]
  );

  const totalPaid = Number(paidRes.rows[0].paid);
  const totalDue = totalFee - totalPaid;

  await client.query(
    `
    INSERT INTO student_fee_summary
      (student_id, academic_year, total_fee, total_paid, total_due, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (student_id, academic_year)
    DO UPDATE SET
      total_fee = EXCLUDED.total_fee,
      total_paid = EXCLUDED.total_paid,
      total_due = EXCLUDED.total_due,
      updated_at = NOW()
    `,
    [studentId, academicYear, totalFee, totalPaid, totalDue]
  );
}

/* ---------- PAY FEE ---------- */

async function collectFee(data) {
  const {
    studentId,
    academicYear,
    feeType,     // can be category string or fee_structure id - we accept both
    amount,      // number - amount paid now
    paymentMode, // e.g. cash, upi, bank
    collectedBy, // user id or name
    reference,   // optional txn id/reference
  } = data;

  if (!studentId || !academicYear || amount == null || !paymentMode) {
    throw new Error("studentId, academicYear, amount and paymentMode are required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // compute student's total fee for the year (used for total_amount in row and for summary)
    const totalFee = await calculateTotalFee(studentId, academicYear);

    // generate receipt
    const receiptNo = `RCPT-${Date.now()}`;

    // insert payment row: use paid_amount & total_amount columns that exist in your DB
    const insertQuery = `
      INSERT INTO fee_collections
        (student_id, fee_type, academic_year, total_amount, paid_amount,
         payment_mode, receipt_no, collected_by, reference, paid_on, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      RETURNING id, receipt_no, paid_amount, paid_on
    `;

    const insertParams = [
      studentId,
      feeType || null,
      academicYear,
      totalFee,           // total_amount
      amount,             // paid_amount
      paymentMode,
      receiptNo,
      collectedBy || null,
      reference || null,
    ];

    const ins = await client.query(insertQuery, insertParams);

    // update summary table
    await upsertFeeSummary(client, studentId, academicYear);

    await client.query("COMMIT");

    return {
      success: true,
      payment: ins.rows[0],
      receiptNo,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* ---------- READ SUMMARY ---------- */

async function getStudentFeeSummary(studentId, academicYear) {
  const res = await pool.query(
    `
    SELECT student_id, academic_year, total_fee, total_paid, total_due, updated_at
    FROM student_fee_summary
    WHERE student_id = $1 AND academic_year = $2
    `,
    [studentId, academicYear]
  );

  return res.rows[0] || null;
}

/* ---------- GET PAYMENTS LIST ---------- */

async function getPaymentsByStudent(studentId, academicYear) {
  const res = await pool.query(
    `
    SELECT id, fee_type, academic_year, total_amount, paid_amount, payment_mode,
           receipt_no, collected_by, reference, paid_on, created_at
    FROM fee_collections
    WHERE student_id = $1 AND academic_year = $2
    ORDER BY paid_on DESC
    `,
    [studentId, academicYear]
  );

  return res.rows;
}

module.exports = {
  collectFee,
  getStudentFeeSummary,
  getPaymentsByStudent,
};
