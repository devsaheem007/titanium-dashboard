import { User } from '../models/User.js';
import { AppError, asyncHandler } from '../utils/helpers.js';
import { removeAvatarFile } from '../middleware/upload.js';
import { logActivity } from '../services/common.js';

const publicUser = (user) => ({ ...user.toJSON(), effectivePermissions: user.effectivePermissions() });

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { name, email, currentPassword, theme, notificationPrefs } = req.body;

  if (email && email !== user.email) {
    // Changing the email needs the current password, so a stolen session cannot take over the account.
    if (!currentPassword || !(await user.comparePassword(currentPassword))) {
      throw new AppError('Enter your current password to change your email', 400, { currentPassword: 'Current password is incorrect' });
    }
    user.email = email;
  }
  if (name) user.name = name;
  if (theme) user.theme = theme;
  if (notificationPrefs) {
    for (const [k, v] of Object.entries(notificationPrefs)) user.notificationPrefs[k] = v;
  }
  await user.save();
  if (name || email) await logActivity(user, 'update', 'user', user._id, `${user.name} updated their profile`);
  res.json({ success: true, user: publicUser(user) });
});

export const uploadAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose an image to upload', 400);
  const user = await User.findById(req.user._id);
  const old = user.avatar;
  user.avatar = `/uploads/avatars/${req.file.filename}`;
  await user.save({ validateBeforeSave: false });
  removeAvatarFile(old);
  res.json({ success: true, user: publicUser(user) });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  removeAvatarFile(user.avatar);
  user.avatar = '';
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, user: publicUser(user) });
});
