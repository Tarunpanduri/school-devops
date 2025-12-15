// backend/src/controllers/accounts.controller.js
const accountsService = require('../services/accounting.services');

async function createTransaction(req, res) {
  const payload = req.body;
  if (!payload || typeof payload.amount !== 'number' || !payload.kind || !payload.source) {
    return res.status(400).json({ error: 'kind, source and numeric amount are required' });
  }
  try {
    const row = await accountsService.recordTransaction(payload);
    res.status(201).json({ transaction: row });
  } catch (err) {
    console.error('createTransaction error:', err);
    res.status(500).json({ error: 'Failed to record transaction' });
  }
}

async function listTransactions(req, res) {
  try {
    const { limit, offset, kind, account_name, fromDate, toDate } = req.query;
    const rows = await accountsService.getTransactions({
      limit: Number(limit) || 100, offset: Number(offset) || 0, kind, account_name, fromDate, toDate
    });
    res.json({ transactions: rows });
  } catch (err) {
    console.error('listTransactions error:', err);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
}

async function summary(req, res) {
  try {
    const { fromDate, toDate } = req.query;
    const data = await accountsService.getSummary({ fromDate, toDate });
    res.json(data);
  } catch (err) {
    console.error('summary error:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
}

module.exports = {
  createTransaction,
  listTransactions,
  summary
};
