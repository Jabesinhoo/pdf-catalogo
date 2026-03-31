const { body, validationResult } = require('express-validator');

const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Usuario debe tener entre 3 y 50 caracteres')
    .escape(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Contraseña debe tener al menos 6 caracteres')
    .trim(),
];

const validateCreateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Usuario debe tener entre 3 y 50 caracteres')
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Contraseña debe tener al menos 4 caracteres'),
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nombre debe tener al menos 1 carácter')
    .escape(),
  body('role')
    .isIn(['admin', 'asesor'])
    .withMessage('Rol inválido'),
];

const validateProductSearch = [
  body('mode')
    .isIn(['url', 'name', 'sku'])
    .withMessage('Modo de búsqueda inválido'),
  body('value')
    .optional()
    .trim()
    .escape(),
  body('categories')
    .optional()
    .isArray(),
  body('stockStatuses')
    .optional()
    .isArray(),
];

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateLogin,
  validateCreateUser,
  validateProductSearch,
  checkValidation
};