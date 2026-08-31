const bcrypt = require('bcrypt');
require('dotenv').config();

const { pool } = require('../src/config/db');

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@tecnonacho.com';
  const password = process.argv[4] || 'Admin123!';
  const fullName = process.argv[5] || 'Administrador';

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const query = `
    INSERT INTO users (
      username,
      email,
      password_hash,
      full_name,
      role,
      is_active,
      created_by
    )
    VALUES ($1, $2, $3, $4, 'admin', true, NULL)
    ON CONFLICT (username)
    DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      role = 'admin',
      is_active = true
    RETURNING id, username, email, full_name, role, is_active;
  `;

  const values = [username, email, passwordHash, fullName];

  const result = await pool.query(query, values);
  const user = result.rows[0];

  console.log('Usuario administrador creado/actualizado correctamente:');
  console.log({
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
  });

  console.log('');
  console.log('Credenciales de acceso:');
  console.log(`Usuario: ${username}`);
  console.log(`Correo: ${email}`);
  console.log(`Contraseña: ${password}`);
}

createAdmin()
  .catch((error) => {
    console.error('Error creando administrador:', error.message);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });