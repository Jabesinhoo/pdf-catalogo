const userService = require('../services/userService');

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña requeridos'
      });
    }


    const user = await userService.authenticate(username, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;

    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al crear sesión'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
}

async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
    }
    res.clearCookie('tecnocotizador.sid');
    res.json({ success: true, message: 'Sesión cerrada' });
  });
}

async function getCurrentUser(req, res) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    const user = await userService.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    const user = await userService.getUserById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Se requieren permisos de administrador' });
    }
    next();
  } catch (error) {
    console.error('Error en requireAdmin:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  requireAuth,
  requireAdmin
};