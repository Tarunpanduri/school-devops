const admin = require("../config/firebase");
const { pool } = require("../db");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    // 1) Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    const firebaseUid = decoded.uid;

    // 2) Find user in PostgreSQL
    const result = await pool.query(
      "SELECT * FROM users WHERE firebase_uid = $1",
      [firebaseUid]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found in database" });
    }

    // 3) Attach user to request for controllers
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
