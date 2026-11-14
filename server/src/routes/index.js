import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, forgotLimiter } from '../middleware/rateLimit.js';
import { uploadAvatar } from '../middleware/upload.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as profile from '../controllers/profile.controller.js';
import * as users from '../controllers/users.controller.js';
import * as projects from '../controllers/projects.controller.js';
import * as tasks from '../controllers/tasks.controller.js';
import * as misc from '../controllers/misc.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import * as reports from '../controllers/reports.controller.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ success: true, status: 'ok' }));

// ---------- public ----------
router.get('/settings/public', settings.getPublicSettings);
router.post('/auth/register', authLimiter, validate(S.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(S.loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.post('/auth/forgot-password', forgotLimiter, validate(S.forgotSchema), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(S.resetSchema), auth.resetPassword);

// ---------- everything below needs a valid session ----------
router.use(protect);

router.get('/auth/me', auth.me);
router.post('/auth/change-password', authLimiter, validate(S.changePasswordSchema), auth.changePassword);

router.patch('/profile', validate(S.profileSchema), profile.updateProfile);
router.post('/profile/avatar', uploadAvatar, profile.uploadAvatarHandler);
router.delete('/profile/avatar', profile.removeAvatar);

// users (admin + managers can read; only users:write can change)
router.get('/users/directory', users.directory);
router.get('/users', requirePermission('users:read'), validate(S.userListQuery, 'query'), users.listUsers);
router.post('/users', requirePermission('users:write'), validate(S.createUserSchema), users.createUser);
router.get('/users/:id', requirePermission('users:read'), validate(S.idParam, 'params'), users.getUser);
router.patch('/users/:id', requirePermission('users:write'), validate(S.idParam, 'params'), validate(S.updateUserSchema), users.updateUser);
router.patch('/users/:id/status', requirePermission('users:write'), validate(S.idParam, 'params'), validate(S.statusSchema), users.setStatus);
router.delete('/users/:id', requirePermission('users:write'), validate(S.idParam, 'params'), users.deleteUser);

// projects
router.get('/projects', validate(S.projectListQuery, 'query'), projects.listProjects);
router.get('/projects/:id', validate(S.idParam, 'params'), projects.getProject);
router.post('/projects', requirePermission('projects:write'), validate(S.projectSchema), projects.createProject);
router.patch('/projects/:id', requirePermission('projects:write'), validate(S.idParam, 'params'), validate(S.projectUpdateSchema), projects.updateProject);
router.delete('/projects/:id', requirePermission('projects:write'), validate(S.idParam, 'params'), projects.deleteProject);

// tasks (any user can create their own; editing rules are enforced in the controller)
router.get('/tasks', validate(S.taskListQuery, 'query'), tasks.listTasks);
router.post('/tasks', validate(S.taskSchema), tasks.createTask);
router.patch('/tasks/:id', validate(S.idParam, 'params'), validate(S.taskUpdateSchema), tasks.updateTask);
router.delete('/tasks/:id', requirePermission('tasks:write'), validate(S.idParam, 'params'), tasks.deleteTask);

// notifications
router.get('/notifications', validate(S.notificationQuery, 'query'), misc.listNotifications);
router.patch('/notifications/read-all', misc.markAllRead);
router.patch('/notifications/:id/read', validate(S.idParam, 'params'), misc.markRead);
router.delete('/notifications/:id', validate(S.idParam, 'params'), misc.deleteNotification);

// activity + messages
router.get('/activities', misc.listActivities);
router.get('/messages/conversations', misc.conversations);
router.get('/messages/unread-count', misc.unreadMessageCount);
router.get('/messages/thread/:id', validate(S.idParam, 'params'), misc.thread);
router.post('/messages', validate(S.messageSchema), misc.sendMessage);

// analytics + reports
router.get('/analytics/overview', validate(S.analyticsQuery, 'query'), analytics.overview);
router.get('/analytics/detailed', validate(S.analyticsQuery, 'query'), analytics.detailed);
router.get('/reports/summary', requirePermission('reports:read'), reports.summary);
router.get('/reports/export/:type', requirePermission('reports:read'), reports.exportReport);

// admin settings
router.get('/admin/roles', requirePermission('settings:manage'), settings.getRoles);
router.patch('/admin/settings', requirePermission('settings:manage'), validate(S.settingsSchema), settings.updateSettings);

export default router;
