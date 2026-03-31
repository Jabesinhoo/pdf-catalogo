const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../controllers/authController');
const { validateCreateUser, checkValidation } = require('../middleware/validators');

const {
  listUsers,
  createUser,
  toggleUserStatus,
  changePassword,
  deleteUser,
  changeUserRole 

} = require('../controllers/adminController');

// Todas las rutas de admin requieren autenticación y rol admin
router.use(requireAdmin);

router.get('/users', listUsers);
router.post('/users', validateCreateUser, checkValidation, createUser);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/password', changePassword);
router.post('/users/me/password', changePassword);
router.patch('/users/:id/role', changeUserRole);  
router.delete('/users/:id', deleteUser);
module.exports = router;