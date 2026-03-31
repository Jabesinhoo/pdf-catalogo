const winston = require('winston');
const path = require('path');

// Definir niveles personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  security: 1, // Mismo nivel que warn
};

// Definir colores para cada nivel
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  security: 'cyan',
};

winston.addColors(colors);

// Formato para los logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Crear el logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports: [
    // Logs de error
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs de seguridad
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/security.log'), 
      level: 'security',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Logs combinados
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// En desarrollo, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Función para log de seguridad
logger.security = (message, meta = {}) => {
  logger.log('security', message, { 
    ...meta,
    timestamp: new Date().toISOString(),
    ip: meta.ip || 'unknown',
    user: meta.user || 'anonymous',
  });
};

module.exports = logger;