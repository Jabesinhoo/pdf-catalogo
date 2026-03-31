const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../controllers/authController');
const { cacheAllProducts, getCacheStats } = require('../services/productCacheService');

router.post('/refresh', requireAdmin, async (req, res) => {
  try {
    const result = await cacheAllProducts();
    res.json({ 
      success: true, 
      message: `Caché actualizado con ${result.count} productos`,
      time: result.time 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;