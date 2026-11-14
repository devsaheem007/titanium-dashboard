import rateLimit from 'express-rate-limit';

const make = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// Brute-force protection for login / register / password reset.
export const authLimiter = make(15, 20, 'Too many attempts. Please try again in 15 minutes.');
export const forgotLimiter = make(60, 5, 'Too many reset requests. Please try again later.');
// General API limiter
export const apiLimiter = make(1, 300, 'Too many requests. Please slow down.');
