const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tecnocotizador',
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ""),
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL conectado');
});

pool.on('error', (err) => {
  console.error('❌ Error PostgreSQL:', err);
});

module.exports = pool;