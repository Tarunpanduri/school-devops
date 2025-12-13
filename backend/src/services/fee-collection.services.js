// backend/src/services/fee-collection.services.js
const { pool } = require("../db");

/* ========== helpers ========== */
async function calculateTotalFee(studentId, academicYear) {
  // Get student's class using admission number
  const studentRes = await pool.query(
    `SELECT current_class FROM students WHERE admission_number = $1`,
    [studentId]
  );

  if (!studentRes.rows.length) {
    throw new Error(`Student with admission number "${studentId}" not found`);
  }

  const clazz = studentRes.rows[0].current_class;

  const feeRes = await pool.query(
    `
    SELECT COALESCE(SUM(amount), 0)::numeric AS total
    FROM fee_structures
    WHERE academic_year = $1 AND class = $2
    `,
    [academicYear, clazz]
  );

  return Number(feeRes.rows[0].total);
}

async function upsertFeeSummary(client, studentId, academicYear) {
  const totalFee = await calculateTotalFee(studentId, academicYear);

  const paidRes = await client.query(
    `
    SELECT COALESCE(SUM(amount),0)::numeric AS paid
    FROM fee_collections
    WHERE student_id = $1 AND academic_year = $2
    `,
    [studentId, academicYear]
  );

  const totalPaid = Number(paidRes.rows[0].paid || 0);
  const totalDue = Number((totalFee - totalPaid).toFixed(2));

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

/* ========== collect payment ========== */
/**
 * data = {
 *   studentId,
 *   academicYear,
 *   feeType,
 *   amount,
 *   paymentMode,
 *   reference (optional)
 * }
 * user = req.user (attached by auth middleware)
 */
async function collectFee(data, user) {
  const {
    studentId,
    academicYear,
    feeType,
    amount,
    paymentMode = "Cash",
    reference = null,
  } = data;

  if (!studentId || !academicYear || !feeType || amount == null) {
    const err = new Error("studentId, academicYear, feeType and amount are required");
    err.code = "BAD_INPUT";
    throw err;
  }

  // Validate student exists by admission number
  const studentCheck = await pool.query(
    `SELECT id, admission_number FROM students WHERE admission_number = $1`,
    [studentId]
  );

  if (!studentCheck.rows.length) {
    const err = new Error(`Student with admission number "${studentId}" not found`);
    err.code = "NOT_FOUND";
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate unique receipt number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const receiptNo = `RCPT-${timestamp}-${random}`;

    const insertRes = await client.query(
      `
      INSERT INTO fee_collections
        (student_id, fee_type, academic_year, amount, payment_mode, receipt_no, collected_by, reference)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        studentId,
        feeType,
        academicYear,
        amount,
        paymentMode,
        receiptNo,
        user?.name || user?.email || "System",
        reference,
      ]
    );

    // update/insert summary
    await upsertFeeSummary(client, studentId, academicYear);

    await client.query("COMMIT");
    return mapPaymentRow(insertRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* ========== list payments for student+year ========== */
async function getPayments(studentId, academicYear) {
  if (!studentId || !academicYear) {
    const err = new Error("studentId and academicYear required");
    err.code = "BAD_INPUT";
    throw err;
  }

  const res = await pool.query(
    `
    SELECT
      id,
      student_id,
      fee_type,
      academic_year,
      payment_mode,
      receipt_no,
      collected_by,
      paid_on,
      amount,
      reference
    FROM fee_collections
    WHERE student_id = $1 AND academic_year = $2
    ORDER BY paid_on DESC, id DESC
    `,
    [studentId, academicYear]
  );

  return res.rows.map(mapPaymentRow);
}

/* ========== get summary ========== */
async function getStudentFeeSummary(studentId, academicYear) {
  if (!studentId || !academicYear) {
    const err = new Error("studentId and academicYear required");
    err.code = "BAD_INPUT";
    throw err;
  }

  const res = await pool.query(
    `
    SELECT student_id, academic_year, total_fee, total_paid, total_due, updated_at
    FROM student_fee_summary
    WHERE student_id = $1 AND academic_year = $2
    `,
    [studentId, academicYear]
  );

  const row = res.rows[0];
  if (!row) {
    // If no summary exists, calculate it on the fly
    try {
      const totalFee = await calculateTotalFee(studentId, academicYear);
      
      const paidRes = await pool.query(
        `
        SELECT COALESCE(SUM(amount),0)::numeric AS paid
        FROM fee_collections
        WHERE student_id = $1 AND academic_year = $2
        `,
        [studentId, academicYear]
      );
      
      const totalPaid = Number(paidRes.rows[0].paid || 0);
      const totalDue = Number((totalFee - totalPaid).toFixed(2));
      
      return {
        studentId: studentId,
        academicYear: academicYear,
        totalFee: totalFee,
        totalPaid: totalPaid,
        totalDue: totalDue,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      // If student not found or other error, return zeros
      return {
        studentId: studentId,
        academicYear: academicYear,
        totalFee: 0,
        totalPaid: 0,
        totalDue: 0,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    studentId: row.student_id,
    academicYear: row.academic_year,
    totalFee: Number(row.total_fee || 0),
    totalPaid: Number(row.total_paid || 0),
    totalDue: Number(row.total_due || 0),
    updatedAt: row.updated_at,
  };
}

/* ========== mappers ========== */
function mapPaymentRow(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    feeType: row.fee_type,
    academicYear: row.academic_year,
    paymentMode: row.payment_mode,
    receiptNo: row.receipt_no,
    collectedBy: row.collected_by,
    paidOn: row.paid_on,
    amount: Number(row.amount),
    reference: row.reference || null,
  };
}

module.exports = {
  collectFee,
  getPayments,
  getStudentFeeSummary,
};