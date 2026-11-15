import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { AppError, asyncHandler, escapeRegex, paginate, pageMeta } from '../utils/helpers.js';
import { logActivity, notify, recalcProjectProgress, taskScope, projectScope, canSeeAll } from '../services/common.js';

const populate = [
  { path: 'assignee', select: 'name email avatar' },
  { path: 'project', select: 'name' },
  { path: 'createdBy', select: 'name' },
];

async function checkRefs({ project, assignee }) {
  if (project && !(await Project.exists({ _id: project }))) throw new AppError('Selected project does not exist', 400, { project: 'Selected project does not exist' });
  if (assignee && !(await User.exists({ _id: assignee, isActive: true }))) throw new AppError('Selected user does not exist or is inactive', 400, { assignee: 'Selected user does not exist' });
}

export const listTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, status, priority, project, assignee, mine, overdue } = req.query;
  const and = [taskScope(req.user)];
  if (search) and.push({ $or: [{ title: new RegExp(escapeRegex(search), 'i') }, { description: new RegExp(escapeRegex(search), 'i') }] });
  if (status) and.push({ status });
  if (priority) and.push({ priority });
  if (project) and.push({ project });
  if (assignee) and.push({ assignee });
  if (mine === 'true') and.push({ assignee: req.user._id });
  if (overdue === 'true') and.push({ dueDate: { $lt: new Date() }, status: { $ne: 'done' } });
  const filter = { $and: and };

  const [tasks, total] = await Promise.all([
    Task.find(filter).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);
  res.json({ success: true, data: tasks, pagination: pageMeta(total, page, limit) });
});

export const createTask = asyncHandler(async (req, res) => {
  await checkRefs(req.body);

  const data = { ...req.body, createdBy: req.user._id };
  const canAssignOthers = canSeeAll(req.user);

  if (data.project && !(await Project.exists({
    _id: data.project,
    ...projectScope(req.user),
  }))) {
    throw new AppError('You do not have access to this project', 403);
  }

  if (!canAssignOthers) {
    if (data.assignee && String(data.assignee) !== String(req.user._id)) {
      throw new AppError('You can only assign tasks to yourself', 403);
    }
    data.assignee = req.user._id;
  }

  if (data.status === 'done') data.completedAt = new Date();
  const task = await Task.create(data);
  await recalcProjectProgress(task.project);
  await logActivity(req.user, 'create', 'task', task._id, `${req.user.name} created task "${task.title}"`);
  if (task.assignee && String(task.assignee) !== String(req.user._id)) {
    await notify([task.assignee], { title: 'New task assigned', message: `"${task.title}" was assigned to you.`, type: 'info', link: '/tasks' }, 'taskAssignments');
  }
  res.status(201).json({ success: true, task: await task.populate(populate) });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, ...taskScope(req.user) });
  if (!task) throw new AppError('Task not found', 404);

  const canEditAll = req.user.can('tasks:write');
  let changes = req.body;
  if (!canEditAll) {
    // Regular users may only move their own assigned tasks between statuses.
    if (String(task.assignee) !== String(req.user._id)) throw new AppError('You can only update tasks assigned to you', 403);
    const keys = Object.keys(changes);
    if (keys.some((k) => k !== 'status')) throw new AppError('You can only change the status of your tasks', 403);
  }
  await checkRefs(changes);

  if (!canSeeAll(req.user)) {
    if (changes.project && !(await Project.exists({
      _id: changes.project,
      ...projectScope(req.user),
    }))) {
      throw new AppError('You do not have access to this project', 403);
    }

    if (
      changes.assignee !== undefined &&
      String(changes.assignee) !== String(req.user._id)
    ) {
      throw new AppError('You can only assign tasks to yourself', 403);
    }
  }

  const previousAssignee = String(task.assignee || '');
  const previousProject = task.project;
  const previousStatus = task.status;
  for (const key of ['title', 'description', 'status', 'priority', 'project', 'assignee', 'dueDate']) {
    if (changes[key] !== undefined) task[key] = changes[key];
  }
  if (task.status === 'done' && previousStatus !== 'done') task.completedAt = new Date();
  if (task.status !== 'done') task.completedAt = undefined;
  await task.save();

  await recalcProjectProgress(task.project);
  if (previousProject && String(previousProject) !== String(task.project || '')) await recalcProjectProgress(previousProject);

  await logActivity(req.user, 'update', 'task', task._id, `${req.user.name} updated task "${task.title}"${previousStatus !== task.status ? ` (${task.status.replace('_', ' ')})` : ''}`);
  if (task.assignee && String(task.assignee) !== previousAssignee && String(task.assignee) !== String(req.user._id)) {
    await notify([task.assignee], { title: 'New task assigned', message: `"${task.title}" was assigned to you.`, type: 'info', link: '/tasks' }, 'taskAssignments');
  }
  res.json({ success: true, task: await task.populate(populate) });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    ...taskScope(req.user),
  });
  if (!task) throw new AppError('Task not found', 404);
  await task.deleteOne();
  await recalcProjectProgress(task.project);
  await logActivity(req.user, 'delete', 'task', task._id, `${req.user.name} deleted task "${task.title}"`);
  res.json({ success: true, message: 'Task deleted' });
});
