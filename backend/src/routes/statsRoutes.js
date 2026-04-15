const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../controllers/authController');
const {
  getUserStats,
  getAdminSummary,
  getAdminStats,
  getGlobalTotals,
  getAdminUsers,
  deleteAllDocumentsKeepingStats
} = require('../controllers/statsController');

router.get('/my', requireAuth, getUserStats);

router.get('/admin/summary', requireAuth, requireAdmin, getAdminSummary);
router.get('/admin/stats', requireAuth, requireAdmin, getAdminStats);
router.get('/admin/totals', requireAuth, requireAdmin, getGlobalTotals);
router.get('/admin/users', requireAuth, requireAdmin, getAdminUsers);

router.delete('/admin/delete-all', requireAuth, requireAdmin, deleteAllDocumentsKeepingStats);

module.exports = router;