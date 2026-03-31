#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('../config/db');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
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
  await pool.end(); // ✅ aquí sí está bien
}

runMigrations().catch(console.error);