const rateLimit = require('express-rate-limit');


const loginLimiter = rateLimit({
  windowMs: 10 * 1000, 
  max: 10, 
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta en 10 segundos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar logins exitosos
});

// Límite general para API (100 peticiones por IP cada 15 minutos)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite más estricto para creación de documentos
const documentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // 50 documentos por hora
  message: {
    success: false,
    message: 'Has alcanzado el límite de documentos por hora.'
  },
});

module.exports = {
  loginLimiter,
  apiLimiter,
  documentLimiter
};