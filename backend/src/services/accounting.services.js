// backend/src/services/accounts.service.js
const { pool } = require('../db');

/**
 * Record a transaction in accounts_transactions and update balance snapshot.
 * transaction = {
 *   kind: 'income'|'expense'|'adjustment',
 *   source: 'fee'|'salary'|'vendor'|...,
 *   reference_id: string|number|null,
 *   amount: number,
 *   currency?: 'INR',
 *   payment_mode?: 'Cash'|'UPI'|...,
 *   account_name?: string,
 *   details?: object,
 *   created_by?: number|null
 * }
 */
async function recordTransaction(transaction) {
  const {
    kind, source, reference_id, amount, currency = 'INR',
    payment_mode = null, account_name = 'Cash', details = {}, created_by = null
  } = transaction;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertRes = await client.query(
      `INSERT INTO accounts_transactions
        (kind, source, reference_id, amount, currency, payment_mode, account_name, details, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       RETURNING *`,
      [kind, source, reference_id?.toString() ?? null, amount, currency, payment_mode, account_name, JSON.stringify(details || {}), created_by]
    );

    // Update balance snapshot for account_name
    // For incomes: add, for expenses: subtract, adjustments: add/sub depending on sign of amount
    const sign = (kind === 'expense') ? -1 : 1;
    const delta = Number(amount) * sign;

    await client.query(
      `INSERT INTO accounts_balance (account_name, balance, currency, updated_at)
         VALUES ($1, $2, $3, NOW())
       ON CONFLICT (account_name)
       DO UPDATE SET
         balance = accounts_balance.balance + EXCLUDED.balance,
         updated_at = NOW()`,
      [account_name, delta, currency]
    );

    await client.query('COMMIT');
    return insertRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getTransactions({ limit = 100, offset = 0, kind, account_name, fromDate, toDate } = {}) {
  const where = [];
  const params = [];
  let idx = 1;

  if (kind) {
    where.push(`kind = $${idx++}`);
    params.push(kind);
  }
  if (account_name) {
    where.push(`account_name = $${idx++}`);
    params.push(account_name);
  }
  if (fromDate) {
    where.push(`created_at >= $${idx++}`);
    params.push(fromDate);
  }
  if (toDate) {
    where.push(`created_at <= $${idx++}`);
    params.push(toDate);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const q = `
    SELECT id, kind, source, reference_id, amount, currency, payment_mode, account_name, details, created_by, created_at
    FROM accounts_transactions
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  const res = await pool.query(q, params);
  return res.rows;
}

async function getSummary({ fromDate, toDate } = {}) {
  const params = [];
  let idx = 1;
  let where = '';

  if (fromDate) {
    where = `WHERE created_at >= $${idx++}`;
    params.push(fromDate);
  }
  if (toDate) {
    where += where ? ` AND created_at <= $${idx++}` : `WHERE created_at <= $${idx++}`;
    params.push(toDate);
  }

  const q = `
    SELECT kind, SUM(amount) as total
    FROM accounts_transactions
    ${where}
    GROUP BY kind
  `;

  const res = await pool.query(q, params);
  const summary = { income: 0, expense: 0, adjustment: 0 };
  for (const row of res.rows) {
    summary[row.kind] = Number(row.total) || 0;
  }

  // add balances snapshot
  const balRes = await pool.query(`SELECT account_name, balance FROM accounts_balance`);
  const balances = balRes.rows.reduce((acc, r) => {
    acc[r.account_name] = Number(r.balance) || 0;
    return acc;
  }, {});

  return { summary, balances };
}

module.exports = {
  recordTransaction,
  getTransactions,
  getSummary
};
