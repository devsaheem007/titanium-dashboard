import crypto from 'crypto';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { Setting } from '../models/Setting.js';
import { AppError, asyncHandler } from '../utils/helpers.js';
import { issueToken, clearToken } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { env } from '../config/env.js';
import { logActivity, notifyAdmins } from '../services/common.js';

const publicUser = (user) => ({ ...user.toJSON(), effectivePermissions: user.effectivePermissions() });

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;

  if (!isFirstUser) {
    const settings = await Setting.getApp();
    if (!settings.allowRegistration) throw new AppError('Registration is currently disabled', 403);
  }

  // The very first account becomes the admin so the app can be bootstrapped.
  const user = await User.create({ name, email, password, role: isFirstUser ? 'admin' : 'user', lastLoginAt: new Date() });
  issueToken(res, user._id);

  await logActivity(user, 'register', 'user', user._id, `${user.name} joined`);
  if (!isFirstUser) {
    await notifyAdmins({ title: 'New user registered', message: `${user.name} (${user.email}) created an account.`, type: 'info', link: `/users/${user._id}` }, user._id);
  }
  res.status(201).json({ success: true, user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password so attackers cannot discover which emails exist.
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('This account has been deactivated. Contact an administrator.', 403);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  issueToken(res, user._id);
  await logActivity(user, 'login', 'auth', user._id, `${user.name} signed in`);
  res.json({ success: true, user: publicUser(user) });
});

export const logout = asyncHandler(async (_req, res) => {
  clearToken(res);
  res.json({ success: true, message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && user.isActive) {
    await PasswordResetToken.deleteMany({ user: user._id });
    const raw = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({ user: user._id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
    const link = `${env.clientUrl}/reset-password/${raw}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Titanium password',
        text: `Hi ${user.name},\n\nUse this link to reset your password (valid for 30 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Hi ${user.name.replace(/[<>&]/g, '')},</p><p><a href="${link}">Reset your password</a> (valid for 30 minutes).</p><p>If you did not request this, you can ignore this email.</p>`,
      });
    } catch (err) {
      console.error('Reset email failed:', err.message);
    }
  }
  // Always the same response, whether or not the email exists.
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const record = await PasswordResetToken.findOne({ tokenHash: sha256(req.body.token), used: false, expiresAt: { $gt: new Date() } });
  if (!record) throw new AppError('This reset link is invalid or has expired', 400);

  const user = await User.findById(record.user).select('+password');
  if (!user) throw new AppError('Account no longer exists', 400);
  user.password = req.body.password;
  await user.save();
  await PasswordResetToken.deleteMany({ user: user._id });
  await logActivity(user, 'security', 'auth', user._id, `${user.name} reset their password`);
  res.json({ success: true, message: 'Password updated. You can now sign in.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new AppError('Current password is incorrect', 400, { currentPassword: 'Current password is incorrect' });
  user.password = req.body.newPassword;
  await user.save();
  issueToken(res, user._id); // keep this device signed in with a fresh token
  await logActivity(user, 'security', 'auth', user._id, `${user.name} changed their password`);
  res.json({ success: true, message: 'Password changed successfully' });
});
