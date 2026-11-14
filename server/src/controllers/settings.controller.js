import { Setting } from '../models/Setting.js';
import { asyncHandler } from '../utils/helpers.js';
import { PERMISSIONS, ROLE_DEFAULTS, ROLES } from '../config/constants.js';
import { logActivity } from '../services/common.js';

const publicShape = (s) => ({ appName: s.appName, allowRegistration: s.allowRegistration, systemAlert: s.systemAlert });

// No login needed: the login page shows the app name, and the dashboard shows the system alert.
export const getPublicSettings = asyncHandler(async (_req, res) => {
  res.json({ success: true, settings: publicShape(await Setting.getApp()) });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.getApp();
  for (const key of ['appName', 'allowRegistration', 'systemAlert']) {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  }
  await settings.save();
  await logActivity(req.user, 'update', 'settings', settings._id, `${req.user.name} updated application settings`);
  res.json({ success: true, settings: publicShape(settings) });
});

export const getRoles = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    roles: ROLES.map((role) => ({ role, permissions: ROLE_DEFAULTS[role] })),
    permissions: Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description })),
  });
});
