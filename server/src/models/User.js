import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ROLE_DEFAULTS, PERMISSIONS } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    // Extra permissions on top of the role defaults
    permissions: { type: [String], default: [], validate: (v) => v.every((p) => p in PERMISSIONS) },
    isActive: { type: Boolean, default: true, index: true },
    avatar: { type: String, default: '' },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    notificationPrefs: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      taskAssignments: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ name: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.effectivePermissions = function effectivePermissions() {
  return [...new Set([...(ROLE_DEFAULTS[this.role] || []), ...this.permissions])];
};

userSchema.methods.can = function can(permission) {
  return this.role === 'admin' || this.effectivePermissions().includes(permission);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
