import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Activity } from '../models/Activity.js';
import { AppError, asyncHandler } from '../utils/helpers.js';
import { logActivity, projectScope, taskScope, canSeeAll } from '../services/common.js';

// Prevent spreadsheet formula injection (=, +, -, @ at the start of a cell) and escape CSV characters.
function cell(value) {
  let s = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
const toCsv = (headers, rows) => [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n');

const builders = {
  users: async (user) => {
    if (!user.can('users:read')) throw new AppError('You do not have permission to export user reports', 403);
    const data = await User.find().sort({ createdAt: -1 });
    return {
      headers: ['Name', 'Email', 'Role', 'Active', 'Last login', 'Created'],
      rows: data.map((u) => [u.name, u.email, u.role, u.isActive ? 'yes' : 'no', u.lastLoginAt, u.createdAt]),
    };
  },
  projects: async (user) => {
    const data = await Project.find(projectScope(user)).populate('owner', 'name').populate('assignedTo', 'name').sort({ createdAt: -1 });
    return {
      headers: ['Name', 'Status', 'Progress %', 'Deadline', 'Owner', 'Assigned to', 'Created'],
      rows: data.map((p) => [p.name, p.status, p.progress, p.deadline, p.owner?.name, p.assignedTo.map((a) => a.name).join('; '), p.createdAt]),
    };
  },
  tasks: async (user) => {
    const data = await Task.find(taskScope(user)).populate('project', 'name').populate('assignee', 'name').sort({ createdAt: -1 });
    return {
      headers: ['Title', 'Status', 'Priority', 'Project', 'Assignee', 'Due', 'Completed', 'Created'],
      rows: data.map((t) => [t.title, t.status, t.priority, t.project?.name, t.assignee?.name, t.dueDate, t.completedAt, t.createdAt]),
    };
  },
  activity: async (user) => {
    const data = await Activity.find(canSeeAll(user) ? {} : { actor: user._id }).populate('actor', 'name').sort({ createdAt: -1 }).limit(5000);
    return {
      headers: ['When', 'Actor', 'Type', 'Action', 'Message'],
      rows: data.map((a) => [a.createdAt, a.actor?.name, a.entityType, a.action, a.message]),
    };
  },
};

export const summary = asyncHandler(async (req, res) => {
  const user = req.user;
  const [users, projects, tasks, activity] = await Promise.all([
    user.can('users:read') ? User.countDocuments() : null,
    Project.countDocuments(projectScope(user)),
    Task.countDocuments(taskScope(user)),
    Activity.countDocuments(canSeeAll(user) ? {} : { actor: user._id }),
  ]);
  res.json({ success: true, counts: { users, projects, tasks, activity } });
});

export const exportReport = asyncHandler(async (req, res) => {
  const build = builders[req.params.type];
  if (!build) throw new AppError('Unknown report type', 404);
  const { headers, rows } = await build(req.user);
  await logActivity(req.user, 'security', 'auth', req.user._id, `${req.user.name} exported the ${req.params.type} report`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="titanium-${req.params.type}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${toCsv(headers, rows)}`);
});
