// Single source of truth for roles and permissions.
export const ROLES = ['admin', 'manager', 'user'];

export const PERMISSIONS = {
  'users:read': 'View the user list and user details',
  'users:write': 'Create, edit, deactivate and delete users',
  'projects:write': 'Create, edit and delete projects',
  'tasks:write': 'Create, edit, assign and delete any task',
  'reports:read': 'View and export reports',
  'settings:manage': 'Change application settings',
};

// Permissions every account of a role gets automatically.
export const ROLE_DEFAULTS = {
  admin: Object.keys(PERMISSIONS),
  manager: ['users:read', 'projects:write', 'tasks:write', 'reports:read'],
  user: [],
};

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed'];
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'];
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'alert'];
