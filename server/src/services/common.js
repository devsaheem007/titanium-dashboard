import { Activity } from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { emailConfigured, sendEmail } from '../utils/email.js';

export async function logActivity(actor, action, entityType, entityId, message) {
  try {
    await Activity.create({ actor: actor?._id || actor, action, entityType, entityId, message });
  } catch (err) {
    console.error('Failed to log activity', err.message);
  }
}

// category: 'taskAssignments' | 'projectUpdates' | undefined (always delivered)
// Respects each recipient's notification preferences.
export async function notify(userIds, { title, message = '', type = 'info', link = '' }, category) {
  try {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];
    if (!ids.length) return;
    const users = await User.find({ _id: { $in: ids }, isActive: true });
    const docs = [];
    for (const u of users) {
      const prefs = u.notificationPrefs || {};
      if (category && prefs[category] === false) continue;
      if (prefs.inApp !== false) docs.push({ user: u._id, title, message, type, link });
      if (prefs.email && emailConfigured()) {
        sendEmail({ to: u.email, subject: title, text: message || title }).catch((e) =>
          console.error('Notification email failed', e.message)
        );
      }
    }
    if (docs.length) await Notification.insertMany(docs);
  } catch (err) {
    console.error('Failed to create notification', err.message);
  }
}

export async function notifyAdmins(payload, excludeId) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await notify(admins.map((a) => a._id).filter((id) => String(id) !== String(excludeId)), payload);
}

// Keeps Project.progress in sync with its tasks (percentage of tasks in "done").
export async function recalcProjectProgress(projectId) {
  if (!projectId) return;
  const [total, done] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: 'done' }),
  ]);
  if (total === 0) return; // keep the manual progress value
  await Project.findByIdAndUpdate(projectId, { progress: Math.round((done / total) * 100) });
}

// Which projects / tasks a user is allowed to see.
export const canSeeAll = (user) => user.role === 'admin' || user.role === 'manager';

export const projectScope = (user) =>
  canSeeAll(user) ? {} : { $or: [{ owner: user._id }, { assignedTo: user._id }] };

export const taskScope = (user) =>
  canSeeAll(user) ? {} : { $or: [{ assignee: user._id }, { createdBy: user._id }] };
