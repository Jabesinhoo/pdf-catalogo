const rateLimit = require('express-rate-limit');

/*
 * Login:
 * Protección estricta contra fuerza bruta.
 * Los logins exitosos no consumen cuota.
 */
const loginLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 10,
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta en 10 segundos.'
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/*
 * API general:
 * TecnoCotizador es utilizado simultáneamente por múltiples asesores,
 * que incluso pueden compartir una misma IP pública.
 *
 * 6000 solicitudes / 15 minutos permite concurrencia normal
 * sin dejar la API completamente sin protección.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6000,
  message: {
    success: false,
    message: 'Demasiadas peticiones. Intenta nuevamente en unos segundos.'
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

/*
 * Generación de documentos:
 * Separado del límite general porque generar documentos sí consume
 * más recursos que consultar productos o categorías.
 */
const documentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 500,
  message: {
    success: false,
    message: 'Has alcanzado el límite temporal de generación de documentos.'
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  documentLimiter
};
