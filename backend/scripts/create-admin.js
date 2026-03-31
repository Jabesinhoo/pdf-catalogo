const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tecnocotizador',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  console.log('🚀 Ejecutando migraciones...\n');
  
  for (const file of migrationFiles) {
    console.log(`📦 Ejecutando: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`✅ ${file} - OK\n`);
    } catch (error) {
      console.error(`❌ Error en ${file}:`, error.message);
      if (!error.message.includes('already exists')) {
        console.error('Detalles:', error);
        process.exit(1);
      }
    }
  }
  
  console.log('🎉 Migraciones completadas');
  await pool.end();
}

runMigrations().catch(console.error);