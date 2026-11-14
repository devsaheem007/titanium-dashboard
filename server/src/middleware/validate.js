import { ZodError } from 'zod';
import { AppError } from '../utils/helpers.js';

// validate(schema, 'body' | 'query' | 'params') parses and replaces the request data with the cleaned result.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  req[source] = result.data;
  next();
};

export function formatZodError(err) {
  const fields = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] || 'Invalid input';
  return new AppError(first, 400, fields);
}

export { ZodError };
