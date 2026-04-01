const rateLimit = require('express-rate-limit');

// Función auxiliar para generar clave con IP + usuario
const keyGenerator = (req) => {
  // Usar la función incorporada para manejar IPv6 correctamente
  const ip = rateLimit.ipKeyGenerator(req);
  const userId = req.user?.id || req.user?.username;
  return userId ? `${ip}:${userId}` : ip;
};

const loginLimiter = rateLimit({
  windowMs: 10 * 1000, 
  max: 10, 
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta en 10 segundos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: keyGenerator, // Usar la función que maneja IPv6
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
});

const categoriesLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Demasiadas peticiones de categorías. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Demasiadas búsquedas. Por favor espera un momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
});

const documentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Has alcanzado el límite de documentos por hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGenerator,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  categoriesLimiter,
  searchLimiter,
  documentLimiter
};