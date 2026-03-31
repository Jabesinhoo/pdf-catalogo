const userService = require('../services/userService');
const pool = require('../config/db'); // ✅ SOLO ESTE

async function listUsers(req, res) {
  try {
    const users = await userService.listUsers(req.session.userId);
    res.json({ success: true, users });
  } catch (error) {
    res.status(error.message === 'No autorizado' ? 403 : 500).json({
      success: false,
      message: error.message,
    });
  }
}

async function createUser(req, res) {
  try {
    const { username, email, password, fullName, role } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    const newUser = await userService.createUser(
      { username, email, password, full_name: fullName, role: role || 'asesor' },
      req.session.userId
    );

    res.json({ success: true, message: 'Usuario creado exitosamente', user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const result = await userService.toggleUserStatus(id, req.session.userId, active);
    if (!result) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({ success: true, message: `Usuario ${active ? 'activado' : 'desactivado'}` });
  } catch (error) {
    res.status(error.message === 'No autorizado' ? 403 : 500).json({
      success: false,
      message: error.message,
    });
  }
}

async function changePassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const targetId = id === 'me' ? req.session.userId : id;
    const result = await userService.changePassword(targetId, newPassword, req.session.userId);

    if (!result) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    res.status(error.message === 'No autorizado' ? 403 : 500).json({
      success: false,
      message: error.message,
    });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.session.userId;

    if (id === String(adminId)) {
      return res.status(400).json({ success: false, message: 'No puedes eliminarte a ti mismo' });
    }

    const userToDelete = await userService.getUserById(id);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando usuario: ' + error.message });
  }
}

// Cambiar rol de usuario
async function changeUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.session.userId;

    console.log('🎭 Cambiando rol - usuario:', id, 'nuevo rol:', role);

    const admin = await userService.getUserById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const userToUpdate = await userService.getUserById(id);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (id === String(adminId)) {
      return res.status(400).json({ success: false, message: 'No puedes cambiar tu propio rol' });
    }

    if (!['admin', 'asesor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    // ✅ USAR POOL GLOBAL
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    console.log('✅ Rol actualizado para usuario:', id);

    res.json({ success: true, message: 'Rol actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error cambiando rol:', error);
    res.status(500).json({ success: false, message: 'Error cambiando rol: ' + error.message });
  }
}

module.exports = {
  listUsers,
  createUser,
  toggleUserStatus,
  changePassword,
  deleteUser,
  changeUserRole 
};