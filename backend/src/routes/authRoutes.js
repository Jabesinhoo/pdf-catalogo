const express = require('express');
const router = express.Router();
const { login, logout, getCurrentUser } = require('../controllers/authController');
const { requireAuth } = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;