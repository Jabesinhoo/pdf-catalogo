const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../controllers/authController');
const {
  getUserStats,
  getAdminSummary,
  getAdminStats,
  getGlobalTotals,
  getAdminUsers
} = require('../controllers/statsController');

// Cualquier usuario autenticado puede ver sus estadísticas
router.get('/my', requireAuth, getUserStats);

// Solo admin puede ver estadísticas globales
router.get('/admin/summary', requireAuth, requireAdmin, getAdminSummary);
router.get('/admin/stats', requireAuth, requireAdmin, getAdminStats);
router.get('/admin/totals', requireAuth, requireAdmin, getGlobalTotals);
router.get('/admin/users', requireAuth, requireAdmin, getAdminUsers);

module.exports = router;