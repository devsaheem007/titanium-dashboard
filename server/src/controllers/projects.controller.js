import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { AppError, asyncHandler, escapeRegex, paginate, pageMeta } from '../utils/helpers.js';
import { logActivity, notify, projectScope, canSeeAll } from '../services/common.js';

const populate = [
  { path: 'owner', select: 'name email avatar' },
  { path: 'assignedTo', select: 'name email avatar' },
];

async function withTaskStats(projects) {
  const ids = projects.map((p) => p._id);
  const stats = await Task.aggregate([
    { $match: { project: { $in: ids } } },
    { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
  ]);
  const map = new Map(stats.map((s) => [String(s._id), s]));
  return projects.map((p) => {
    const s = map.get(String(p._id));
    return { ...p.toJSON(), taskStats: { total: s?.total || 0, done: s?.done || 0 } };
  });
}

async function findAccessible(user, id) {
  const project = await Project.findOne({ _id: id, ...projectScope(user) }).populate(populate);
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

export const listProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, status, assignee } = req.query;
  const filter = { ...projectScope(req.user) };
  const and = [];
  if (search) and.push({ $or: [{ name: new RegExp(escapeRegex(search), 'i') }, { description: new RegExp(escapeRegex(search), 'i') }] });
  if (status) and.push({ status });
  if (assignee) and.push({ assignedTo: assignee });
  if (and.length) filter.$and = and;

  const [projects, total] = await Promise.all([
    Project.find(filter).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(filter),
  ]);
  res.json({ success: true, data: await withTaskStats(projects), pagination: pageMeta(total, page, limit) });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await findAccessible(req.user, req.params.id);
  const tasks = await Task.find({ project: project._id }).populate('assignee', 'name avatar').sort({ createdAt: -1 });
  const [withStats] = await withTaskStats([project]);
  res.json({ success: true, project: withStats, tasks });
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await Project.create({ ...req.body, owner: req.user._id });
  await logActivity(req.user, 'create', 'project', project._id, `${req.user.name} created project "${project.name}"`);
  await notify(project.assignedTo.filter((id) => String(id) !== String(req.user._id)), { title: 'Added to a project', message: `You were added to "${project.name}".`, type: 'info', link: '/projects' }, 'projectUpdates');
  const populated = await project.populate(populate);
  res.status(201).json({ success: true, project: populated });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await findAccessible(req.user, req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const before = project.assignedTo.map(String);

  for (const key of ['name', 'description', 'status', 'deadline', 'progress', 'assignedTo']) {
    if (req.body[key] !== undefined) project[key] = req.body[key];
  }
  await project.save();
  // A manual progress edit only sticks while the project has no tasks.
  const taskCount = await Task.countDocuments({ project: project._id });
  if (taskCount > 0) {
    const done = await Task.countDocuments({ project: project._id, status: 'done' });
    project.progress = Math.round((done / taskCount) * 100);
    await project.save();
  }

  const added = project.assignedTo.map(String).filter((id) => !before.includes(id) && id !== String(req.user._id));
  await notify(added, { title: 'Added to a project', message: `You were added to "${project.name}".`, type: 'info', link: '/projects' }, 'projectUpdates');
  await logActivity(req.user, 'update', 'project', project._id, `${req.user.name} updated project "${project.name}"`);
  res.json({ success: true, project: await project.populate(populate) });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await findAccessible(req.user, req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  await logActivity(req.user, 'delete', 'project', project._id, `${req.user.name} deleted project "${project.name}"`);
  res.json({ success: true, message: 'Project and its tasks deleted' });
});

export { canSeeAll };
