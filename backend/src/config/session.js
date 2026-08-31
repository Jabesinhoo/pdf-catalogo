const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('../config/db'); // ✅ SOLO ESTE

const sessionConfig = {
  store: new pgSession({
    pool: pool,
    tableName: 'session',
  }),
  secret: process.env.SESSION_SECRET || 'tecnocotizador-super-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    sameSite: 'none',
    domain: '.tecnonacho.com',
  },
  rolling: true,
  name: 'tecnocotizador.sid',
};

module.exports = sessionConfig;
