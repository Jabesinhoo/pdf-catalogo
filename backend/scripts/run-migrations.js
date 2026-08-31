#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { pool } = require('../src/config/db');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`No existe la carpeta de migraciones: ${migrationsDir}`);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No hay archivos .sql en la carpeta migrations.');
    return;
  }

  console.log('🚀 Ejecutando migraciones SQL...\n');

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`📦 Ejecutando: ${file}`);

    try {
      await pool.query(sql);
      console.log(`✅ ${file} - OK\n`);
    } catch (error) {
      const message = error.message || '';

      const isAlreadyApplied =
        message.includes('already exists') ||
        message.includes('ya existe') ||
        message.includes('already exists') ||
        message.includes('duplicate column') ||
        message.includes('columna') && message.includes('ya existe');

      if (isAlreadyApplied) {
        console.log(`⚠️ ${file} parece estar aplicado. Continuando...\n`);
        continue;
      }

      console.error(`❌ Error en ${file}:`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log('🎉 Migraciones completadas');
}

runMigrations()
  .catch((error) => {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });