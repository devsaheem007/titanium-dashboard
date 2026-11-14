import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/helpers.js';
import { formatZodError } from './validate.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

// Centralised error handler: every error ends up here and is turned into a consistent JSON response.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (err instanceof ZodError) error = formatZodError(err);
  else if (err.name === 'ValidationError' && err.errors) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    error = new AppError(Object.values(fields)[0], 400, fields);
  } else if (err.name === 'CastError') error = new AppError('Invalid id or value', 400);
  else if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    error = new AppError(`That ${field} is already in use`, 409, { [field]: `That ${field} is already in use` });
  } else if (err instanceof multer.MulterError) {
    error = new AppError(err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2MB or smaller' : err.message, 400);
  } else if (err.type === 'entity.parse.failed') error = new AppError('Malformed JSON body', 400);

  const status = error.statusCode || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status >= 500 && env.isProd ? 'Something went wrong on our side' : error.message,
    errors: error.details,
    // Only in development: shows exactly which file and line failed (also visible in the browser's Network tab).
    ...(!env.isProd && status >= 500 && { stack: String(err.stack || '').split('\n').slice(0, 6) }),
  });
}
