import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Activity } from '../models/Activity.js';
import { asyncHandler } from '../utils/helpers.js';
import { canSeeAll, projectScope, taskScope } from '../services/common.js';

const DAY = 24 * 60 * 60 * 1000;
const FORMATS = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' };
const defaultInterval = (days) => (days <= 30 ? 'day' : days <= 90 ? 'week' : 'month');

const pct = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));

// Count documents per time bucket for a date field.
async function series(Model, match, field, interval) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: FORMATS[interval], date: `$${field}` } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ label: r._id, count: r.count }));
}

const grouped = async (Model, match, field) => {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
};

function context(req) {
  const days = Number(req.query.range || 30);
  const interval = req.query.interval || defaultInterval(days);
  const now = new Date();
  const since = new Date(now - days * DAY);
  const prevSince = new Date(now - 2 * days * DAY);
  return { days, interval, now, since, prevSince };
}

// GET /analytics/overview — numbers + charts for the main dashboard
export const overview = asyncHandler(async (req, res) => {
  const { days, interval, now, since, prevSince } = context(req);
  const user = req.user;
  const seeUsers = user.can('users:read');
  const pScope = projectScope(user);
  const tScope = taskScope(user);

  const [totalUsers, newUsers, prevNewUsers, activeUsers, totalProjects, newProjects, prevNewProjects, pendingTasks, overdueTasks, tasksDone, prevTasksDone] = await Promise.all([
    seeUsers ? User.countDocuments() : null,
    seeUsers ? User.countDocuments({ createdAt: { $gte: since } }) : null,
    seeUsers ? User.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }) : null,
    seeUsers ? User.countDocuments({ isActive: true, lastLoginAt: { $gte: since } }) : null,
    Project.countDocuments(pScope),
    Project.countDocuments({ ...pScope, createdAt: { $gte: since } }),
    Project.countDocuments({ ...pScope, createdAt: { $gte: prevSince, $lt: since } }),
    Task.countDocuments({ ...tScope, status: { $ne: 'done' } }),
    Task.countDocuments({ ...tScope, status: { $ne: 'done' }, dueDate: { $lt: now } }),
    Task.countDocuments({ ...tScope, status: 'done', completedAt: { $gte: since } }),
    Task.countDocuments({ ...tScope, status: 'done', completedAt: { $gte: prevSince, $lt: since } }),
  ]);

  const activityMatch = { createdAt: { $gte: since }, ...(canSeeAll(user) ? {} : { actor: user._id }) };
  const [userGrowth, activity, projectStatus, taskStatus] = await Promise.all([
    seeUsers ? series(User, { createdAt: { $gte: since } }, 'createdAt', interval) : [],
    series(Activity, activityMatch, 'createdAt', interval),
    grouped(Project, pScope, 'status'),
    grouped(Task, tScope, 'status'),
  ]);

  res.json({
    success: true,
    range: days,
    interval,
    stats: {
      totalUsers,
      activeUsers,
      totalProjects,
      pendingTasks,
      overdueTasks,
      growth: {
        users: seeUsers ? { value: newUsers, change: pct(newUsers, prevNewUsers) } : null,
        projects: { value: newProjects, change: pct(newProjects, prevNewProjects) },
        tasksCompleted: { value: tasksDone, change: pct(tasksDone, prevTasksDone) },
      },
    },
    charts: { userGrowth, activity, projectStatus, taskStatus },
  });
});

// GET /analytics/detailed — extra charts for the Analytics page
export const detailed = asyncHandler(async (req, res) => {
  const { days, interval, now, since } = context(req);
  const user = req.user;
  const pScope = projectScope(user);
  const tScope = taskScope(user);

  const [completedSeries, createdSeries, priority, status, projectStatus, projectAgg, overdue, completionTimes, topAssignees] = await Promise.all([
    series(Task, { ...tScope, status: 'done', completedAt: { $gte: since } }, 'completedAt', interval),
    series(Task, { ...tScope, createdAt: { $gte: since } }, 'createdAt', interval),
    grouped(Task, tScope, 'priority'),
    grouped(Task, tScope, 'status'),
    grouped(Project, pScope, 'status'),
    Project.aggregate([{ $match: pScope }, { $group: { _id: null, avgProgress: { $avg: '$progress' }, total: { $sum: 1 } } }]),
    Task.countDocuments({ ...tScope, status: { $ne: 'done' }, dueDate: { $lt: now } }),
    Task.aggregate([
      { $match: { ...tScope, status: 'done', completedAt: { $gte: since } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$completedAt', '$createdAt'] } }, count: { $sum: 1 } } },
    ]),
    canSeeAll(user)
      ? Task.aggregate([
          { $match: { status: 'done', completedAt: { $gte: since }, assignee: { $ne: null } } },
          { $group: { _id: '$assignee', done: { $sum: 1 } } },
          { $sort: { done: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
          { $unwind: '$u' },
          { $project: { _id: 0, name: '$u.name', done: 1 } },
        ])
      : [],
  ]);

  // Merge created vs completed on one timeline
  const labels = [...new Set([...createdSeries.map((s) => s.label), ...completedSeries.map((s) => s.label)])].sort();
  const created = new Map(createdSeries.map((s) => [s.label, s.count]));
  const completed = new Map(completedSeries.map((s) => [s.label, s.count]));
  const taskTrend = labels.map((label) => ({ label, created: created.get(label) || 0, completed: completed.get(label) || 0 }));

  const totalTasks = Object.values(status).reduce((a, b) => a + b, 0);
  const projectTotal = projectAgg[0]?.total || 0;

  res.json({
    success: true,
    range: days,
    interval,
    taskTrend,
    taskPriority: priority,
    taskStatus: status,
    projectStatus,
    projectCompletion: {
      total: projectTotal,
      completed: projectStatus.completed || 0,
      completionRate: projectTotal ? Math.round(((projectStatus.completed || 0) / projectTotal) * 100) : 0,
      avgProgress: Math.round(projectAgg[0]?.avgProgress || 0),
    },
    taskPerformance: {
      total: totalTasks,
      done: status.done || 0,
      completionRate: totalTasks ? Math.round(((status.done || 0) / totalTasks) * 100) : 0,
      overdue,
      avgCompletionHours: completionTimes[0] ? Math.round((completionTimes[0].avgMs / 3600000) * 10) / 10 : null,
    },
    topAssignees,
  });
});
