import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError, asyncHandler } from '../utils/helpers.js';

export const COOKIE_NAME = 'titanium_token';

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser can never read the token (blocks XSS theft)
  secure: env.isProd, // HTTPS only in production
  sameSite: env.isProd ? 'strict' : 'lax', // blocks cross-site request forgery
  path: '/',
});

export function issueToken(res, userId) {
  const token = jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: `${env.jwtExpiresDays}d` });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: env.jwtExpiresDays * 24 * 60 * 60 * 1000 });
}

export function clearToken(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

// Requires a valid login cookie. Sets req.user.
export const protect = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new AppError('Not authenticated', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Session expired, please log in again', 401);
  }

  const user = await User.findById(payload.id);
  if (!user) throw new AppError('Account no longer exists', 401);
  if (!user.isActive) throw new AppError('This account has been deactivated', 403);

  // Tokens issued before a password change stop working.
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppError('Password was changed, please log in again', 401);
  }

  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('You do not have access to this resource', 403));

export const requirePermission = (permission) => (req, _res, next) =>
  req.user.can(permission) ? next() : next(new AppError('You do not have permission to do that', 403));
