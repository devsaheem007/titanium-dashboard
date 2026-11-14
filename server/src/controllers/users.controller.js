import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Notification } from '../models/Notification.js';
import { Activity } from '../models/Activity.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { AppError, asyncHandler, escapeRegex, paginate, pageMeta } from '../utils/helpers.js';
import { logActivity, notify } from '../services/common.js';
import { removeAvatarFile } from '../middleware/upload.js';

async function ensureAnotherActiveAdmin(excludeId) {
  const count = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: excludeId } });
  if (count === 0) throw new AppError('At least one active administrator must remain', 400);
}

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, role, status } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (role) filter.role = role;
  if (status) filter.isActive = status === 'active';

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data: users, pagination: pageMeta(total, page, limit) });
});

// Minimal list used by assignment dropdowns and the messages page (available to every signed-in user).
export const directory = asyncHandler(async (_req, res) => {
  const users = await User.find({ isActive: true }).select('name email avatar role').sort({ name: 1 }).limit(500);
  res.json({ success: true, data: users });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const [projects, openTasks, doneTasks, activities] = await Promise.all([
    Project.countDocuments({ $or: [{ owner: user._id }, { assignedTo: user._id }] }),
    Task.countDocuments({ assignee: user._id, status: { $ne: 'done' } }),
    Task.countDocuments({ assignee: user._id, status: 'done' }),
    Activity.find({ actor: user._id }).sort({ createdAt: -1 }).limit(10),
  ]);
  res.json({
    success: true,
    user: { ...user.toJSON(), effectivePermissions: user.effectivePermissions() },
    stats: { projects, openTasks, doneTasks },
    activities,
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  await logActivity(req.user, 'create', 'user', user._id, `${req.user.name} added user ${user.name}`);
  await notify([user._id], { title: 'Welcome to Titanium', message: `An administrator created your account with the ${user.role} role.`, type: 'success' });
  res.status(201).json({ success: true, user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new AppError('User not found', 404);
  const isSelf = String(user._id) === String(req.user._id);
  const { role, isActive } = req.body;

  if (isSelf && ((role && role !== user.role) || isActive === false)) {
    throw new AppError('You cannot change your own role or deactivate your own account', 400);
  }
  if (user.role === 'admin' && ((role && role !== 'admin') || isActive === false)) await ensureAnotherActiveAdmin(user._id);

  const roleChanged = role && role !== user.role;
  for (const key of ['name', 'email', 'password', 'role', 'isActive', 'permissions']) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  }
  await user.save();
  await logActivity(req.user, 'update', 'user', user._id, `${req.user.name} updated user ${user.name}`);
  if (roleChanged) await notify([user._id], { title: 'Your role changed', message: `You are now a ${user.role}.`, type: 'info' });
  res.json({ success: true, user });
});

export const setStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (String(user._id) === String(req.user._id)) throw new AppError('You cannot deactivate your own account', 400);
  if (user.role === 'admin' && !req.body.isActive) await ensureAnotherActiveAdmin(user._id);
  user.isActive = req.body.isActive;
  await user.save({ validateBeforeSave: false });
  await logActivity(req.user, 'update', 'user', user._id, `${req.user.name} ${user.isActive ? 'activated' : 'deactivated'} ${user.name}`);
  res.json({ success: true, user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (String(user._id) === String(req.user._id)) throw new AppError('You cannot delete your own account', 400);
  if (user.role === 'admin') await ensureAnotherActiveAdmin(user._id);

  await Promise.all([
    Task.updateMany({ assignee: user._id }, { $unset: { assignee: 1 } }),
    Project.updateMany({ assignedTo: user._id }, { $pull: { assignedTo: user._id } }),
    Project.updateMany({ owner: user._id }, { owner: req.user._id }), // hand ownership to the deleting admin
    Task.updateMany({ createdBy: user._id }, { createdBy: req.user._id }),
    Notification.deleteMany({ user: user._id }),
    PasswordResetToken.deleteMany({ user: user._id }),
  ]);
  removeAvatarFile(user.avatar);
  await user.deleteOne();
  await logActivity(req.user, 'delete', 'user', user._id, `${req.user.name} deleted user ${user.name}`);
  res.json({ success: true, message: 'User deleted' });
});
