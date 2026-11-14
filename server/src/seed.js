// Optional: creates an admin account plus a small amount of REAL starter data so you can explore the UI.
// Usage: npm run seed            (creates admin only if no users exist, then sample data)
//        npm run seed -- --reset (wipes every collection first)
import './config/env.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { Task } from './models/Task.js';
import { Activity } from './models/Activity.js';
import { Notification } from './models/Notification.js';
import { PasswordResetToken } from './models/PasswordResetToken.js';
import { Message } from './models/Message.js';
import { recalcProjectProgress } from './services/common.js';

const reset = process.argv.includes('--reset');
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function run() {
  await connectDB();
  if (reset) {
    await Promise.all([User, Project, Task, Activity, Notification, PasswordResetToken, Message].map((m) => m.deleteMany({})));
    console.log('All collections cleared.');
  }
  if ((await User.countDocuments()) > 0) {
    console.log('Users already exist, nothing seeded. Use --reset to start over.');
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@titanium.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123';

  const admin = await User.create({ name: 'Admin', email: adminEmail, password: adminPassword, role: 'admin', lastLoginAt: new Date(), createdAt: daysAgo(60) });
  const manager = await User.create({ name: 'Maya Manager', email: 'manager@titanium.local', password: adminPassword, role: 'manager', lastLoginAt: daysAgo(1), createdAt: daysAgo(40) });
  const u1 = await User.create({ name: 'Omar Khan', email: 'omar@titanium.local', password: adminPassword, role: 'user', lastLoginAt: daysAgo(2), createdAt: daysAgo(20) });
  const u2 = await User.create({ name: 'Sara Ali', email: 'sara@titanium.local', password: adminPassword, role: 'user', lastLoginAt: daysAgo(10), createdAt: daysAgo(8) });

  const p1 = await Project.create({ name: 'Website Redesign', description: 'Refresh the marketing site.', status: 'active', deadline: daysAhead(21), owner: manager._id, assignedTo: [u1._id, u2._id] });
  const p2 = await Project.create({ name: 'Mobile App MVP', description: 'First release of the mobile app.', status: 'planning', deadline: daysAhead(60), owner: admin._id, assignedTo: [u1._id] });

  const tasks = [
    { title: 'Design homepage mockups', status: 'done', priority: 'high', project: p1._id, assignee: u2._id, createdBy: manager._id, dueDate: daysAgo(3), completedAt: daysAgo(4), createdAt: daysAgo(12) },
    { title: 'Build responsive navbar', status: 'in_progress', priority: 'medium', project: p1._id, assignee: u1._id, createdBy: manager._id, dueDate: daysAhead(4) },
    { title: 'Write landing page copy', status: 'todo', priority: 'low', project: p1._id, assignee: u2._id, createdBy: manager._id, dueDate: daysAhead(9) },
    { title: 'Set up CI pipeline', status: 'review', priority: 'urgent', project: p2._id, assignee: u1._id, createdBy: admin._id, dueDate: daysAgo(1) },
    { title: 'Define app navigation', status: 'todo', priority: 'medium', project: p2._id, createdBy: admin._id, dueDate: daysAhead(14) },
  ];
  for (const t of tasks) await Task.collection.insertOne({ ...t, createdAt: t.createdAt || new Date(), updatedAt: new Date(), description: '' });
  await recalcProjectProgress(p1._id);
  await recalcProjectProgress(p2._id);

  await Activity.insertMany([
    { actor: admin._id, action: 'register', entityType: 'user', entityId: admin._id, message: 'Admin joined', createdAt: daysAgo(60) },
    { actor: manager._id, action: 'create', entityType: 'project', entityId: p1._id, message: 'Maya Manager created project "Website Redesign"', createdAt: daysAgo(14) },
    { actor: admin._id, action: 'create', entityType: 'project', entityId: p2._id, message: 'Admin created project "Mobile App MVP"', createdAt: daysAgo(5) },
  ]);
  await Notification.create({ user: admin._id, title: 'Welcome to Titanium', message: 'Your workspace is ready. Starter data was created by the seed script.', type: 'success' });

  console.log(`\nSeed complete.\n  Admin login:   ${adminEmail} / ${adminPassword}\n  Other accounts: manager@titanium.local, omar@titanium.local, sara@titanium.local (same password)\n`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
