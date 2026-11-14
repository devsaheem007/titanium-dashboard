import { Notification } from '../models/Notification.js';
import { Activity } from '../models/Activity.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { AppError, asyncHandler, paginate, pageMeta } from '../utils/helpers.js';
import { canSeeAll, logActivity, notify } from '../services/common.js';

// ---------------- notifications ----------------
export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;
  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, data, unreadCount, pagination: pageMeta(total, page, limit) });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ success: true, notification: n });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ success: true, message: 'Notification deleted' });
});

// ---------------- activity timeline ----------------
export const listActivities = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = canSeeAll(req.user) ? {} : { actor: req.user._id };
  const [data, total] = await Promise.all([
    Activity.find(filter).populate('actor', 'name avatar').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Activity.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: pageMeta(total, page, limit) });
});

// ---------------- messages ----------------
export const conversations = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const rows = await Message.aggregate([
    { $match: { $or: [{ from: me }, { to: me }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] },
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', me] }, { $eq: ['$read', false] }] }, 1, 0] } },
      },
    },
    { $sort: { 'last.createdAt': -1 } },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name email avatar');
  const map = new Map(users.map((u) => [String(u._id), u]));
  const data = rows
    .filter((r) => map.has(String(r._id)))
    .map((r) => ({ user: map.get(String(r._id)), lastMessage: { body: r.last.body, createdAt: r.last.createdAt, fromMe: String(r.last.from) === String(me) }, unread: r.unread }));
  const unreadTotal = data.reduce((s, c) => s + c.unread, 0);
  res.json({ success: true, data, unreadTotal });
});

export const thread = asyncHandler(async (req, res) => {
  const other = req.params.id;
  const me = req.user._id;
  const messages = await Message.find({ $or: [{ from: me, to: other }, { from: other, to: me }] }).sort({ createdAt: -1 }).limit(200);
  await Message.updateMany({ from: other, to: me, read: false }, { read: true });
  res.json({ success: true, data: messages.reverse() });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { to, body } = req.body;
  if (String(to) === String(req.user._id)) throw new AppError('You cannot message yourself', 400);
  const recipient = await User.findOne({ _id: to, isActive: true });
  if (!recipient) throw new AppError('Recipient not found', 404);
  const message = await Message.create({ from: req.user._id, to, body });
  await notify([to], { title: `New message from ${req.user.name}`, message: body.slice(0, 120), type: 'info', link: '/messages' });
  res.status(201).json({ success: true, message });
});

export const unreadMessageCount = asyncHandler(async (req, res) => {
  res.json({ success: true, count: await Message.countDocuments({ to: req.user._id, read: false }) });
});

export { logActivity };
