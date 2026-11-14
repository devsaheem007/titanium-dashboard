import { z } from 'zod';
import {
  ROLES,
  PERMISSIONS,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from '../config/constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().trim().toLowerCase().email('Please enter a valid email');
const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const optionalDate = z
  .union([z.string().trim().min(1), z.null(), z.literal('')])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Invalid date' });
      return z.NEVER;
    }
    return d;
  });

const optionalId = z.union([objectId, z.null(), z.literal('')]).optional().transform((v) => (v === '' ? null : v));

export const idParam = z.object({ id: objectId });

// ---------- auth ----------
export const registerSchema = z.object({ name, email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

// ---------- profile ----------
export const profileSchema = z.object({
  name: name.optional(),
  email: email.optional(),
  currentPassword: z.string().optional(),
  theme: z.enum(['dark', 'light']).optional(),
  notificationPrefs: z
    .object({
      inApp: z.boolean().optional(),
      email: z.boolean().optional(),
      taskAssignments: z.boolean().optional(),
      projectUpdates: z.boolean().optional(),
    })
    .optional(),
});

// ---------- users ----------
const permissionList = z.array(z.enum(Object.keys(PERMISSIONS))).max(20);
export const createUserSchema = z.object({
  name,
  email,
  password,
  role: z.enum(ROLES).default('user'),
  isActive: z.boolean().default(true),
  permissions: permissionList.default([]),
});
export const updateUserSchema = z.object({
  name: name.optional(),
  email: email.optional(),
  password: password.optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  permissions: permissionList.optional(),
});
export const statusSchema = z.object({ isActive: z.boolean() });
export const userListQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().trim().max(80).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// ---------- projects ----------
export const projectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  deadline: optionalDate,
  progress: z.coerce.number().min(0).max(100).optional(),
  assignedTo: z.array(objectId).max(50).optional(),
});
export const projectUpdateSchema = projectSchema.partial();
export const projectListQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().trim().max(80).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  assignee: objectId.optional(),
});

// ---------- tasks ----------
export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  project: optionalId,
  assignee: optionalId,
  dueDate: optionalDate,
});
export const taskUpdateSchema = taskSchema.partial();
export const taskListQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().trim().max(80).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  project: objectId.optional(),
  assignee: objectId.optional(),
  mine: z.enum(['true', 'false']).optional(),
  overdue: z.enum(['true', 'false']).optional(),
});

// ---------- misc ----------
export const messageSchema = z.object({ to: objectId, body: z.string().trim().min(1, 'Message cannot be empty').max(2000) });
export const settingsSchema = z.object({
  appName: z.string().trim().min(2).max(40).optional(),
  allowRegistration: z.boolean().optional(),
  systemAlert: z.string().trim().max(300).optional(),
});
export const analyticsQuery = z.object({
  range: z.enum(['7', '30', '90', '365']).default('30'),
  interval: z.enum(['day', 'week', 'month']).optional(),
});
export const notificationQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  unread: z.enum(['true', 'false']).optional(),
});
