const { pool } = require("../db");
const admin = require("../config/firebase");

async function loginWithFirebase(idToken) {
  const decoded = await admin.auth().verifyIdToken(idToken);

  const firebaseUid = decoded.uid;
  const email = decoded.email || "";
  const displayName = decoded.name || "";
  const photoUrl = decoded.picture || "";

  const existing = await pool.query(
    "SELECT * FROM users WHERE firebase_uid = $1",
    [firebaseUid]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const insert = await pool.query(
    `INSERT INTO users (firebase_uid, email, display_name, photo_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [firebaseUid, email, displayName, photoUrl]
  );

  return insert.rows[0];
}

module.exports = {
  loginWithFirebase,
};
