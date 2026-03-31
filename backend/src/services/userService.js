const bcrypt = require('bcrypt');
const pool = require('../config/db'); // ✅ SOLO ESTE

const userService = {
  // Autenticar usuario
  async authenticate(username, password) {
    const query = 'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true';
    const result = await pool.query(query, [username]);
    
    const user = result.rows[0];
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;

    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    delete user.password_hash;
    return user;
  },

  // Obtener usuario por ID
  async getUserById(id) {
    const query = `
      SELECT id, username, email, full_name, role, is_active, created_at, last_login 
      FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Listar usuarios
  async listUsers(adminId) {
    const admin = await this.getUserById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('No autorizado');
    }

    const result = await pool.query(`
      SELECT id, username, email, full_name, role, is_active, created_at, last_login 
      FROM users 
      ORDER BY created_at DESC
    `);

    return result.rows;
  },

  // Crear usuario
  async createUser(userData, createdBy) {
    const admin = await this.getUserById(createdBy);
    if (!admin || admin.role !== 'admin') {
      throw new Error('No autorizado');
    }

    const { username, email, password, full_name, role = 'asesor' } = userData;

    if (!username || !email || !password || !full_name) {
      throw new Error('Faltan datos requeridos');
    }

    const check = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (check.rows.length > 0) {
      throw new Error('Usuario o email ya existe');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, full_name, role, created_at
    `, [
      username,
      email,
      passwordHash,
      full_name,
      role,
      createdBy
    ]);

    return result.rows[0];
  },

  // Activar/desactivar usuario
  async toggleUserStatus(userId, adminId, active) {
    const admin = await this.getUserById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('No autorizado');
    }

    if (userId === adminId) {
      throw new Error('No puedes desactivarte a ti mismo');
    }

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id',
      [active, userId]
    );

    return result.rows[0] || null;
  },

  // Cambiar contraseña
  async changePassword(userId, newPassword, adminId = null) {
    if (adminId && adminId !== userId) {
      const admin = await this.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('No autorizado');
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [passwordHash, userId]
    );

    return result.rows[0] || null;
  }
};

module.exports = userService;