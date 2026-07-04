import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../db/client.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      }
    });
  }
  next();
};

export const signupValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be 3-100 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validate
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

export const groupValidation = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Group name must be 1-255 characters')
    .trim(),
  validate
];

export const groupIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID format'),
  validate
];

export const addUserToGroupValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID format'),
  body('user_ids')
    .isArray({ min: 1 })
    .withMessage('user_ids must be a non-empty array'),
  body('user_ids.*')
    .isUUID()
    .withMessage('Each user_id must be a valid UUID'),
  validate
];

export const expenseValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid group ID format'),
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be 1-500 characters')
    .trim(),
  body('amount')
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Amount must be a positive number')
    .toFloat()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than 0'),
  body('paid_by')
    .isUUID()
    .withMessage('paid_by must be a valid user UUID'),
  body('split_type')
    .optional()
    .isIn(['equal', 'custom'])
    .withMessage('split_type must be either "equal" or "custom"'),
  validate
];

export const splitValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid expense ID format'),
  validate
];

export const usersSearchValidation = [
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be at most 100 characters')
    .trim(),
  validate
];