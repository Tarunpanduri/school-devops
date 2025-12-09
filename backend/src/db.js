const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Simple helper to test connection
async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW() as now");
    console.log("PostgreSQL connected. Time:", result.rows[0].now);
  } catch (err) {
    console.error("Error connecting to PostgreSQL:", err);
  }
}

module.exports = {
  pool,
  testConnection,
};
