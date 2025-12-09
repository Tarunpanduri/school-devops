const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function testConnection() {
  const result = await pool.query("SELECT NOW()");
  console.log("PostgreSQL connected:", result.rows[0].now);
}

module.exports = {
  pool,
  testConnection,
};
