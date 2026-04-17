const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "tecnocotizador",
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ""),
  max: Number(process.env.PG_POOL_MAX || 10),
  min: Number(process.env.PG_POOL_MIN || 1),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000),
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false,
});

let dbReadyLogged = false;

async function verifyDbOnce() {
  const result = await pool.query("SELECT 1 as ok");
  if (!dbReadyLogged) {
    console.log("✅ PostgreSQL listo");
    dbReadyLogged = true;
  }
  return result.rows[0];
}

pool.on("error", (err) => {
  console.error("❌ Error PostgreSQL:", err.message);
});

module.exports = {
  pool,
  verifyDbOnce,
};