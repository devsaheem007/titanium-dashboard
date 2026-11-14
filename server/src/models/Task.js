import mongoose from 'mongoose';
import { TASK_STATUSES, TASK_PRIORITIES } from '../config/constants.js';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Task title is required'], trim: true, minlength: 2, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium', index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date },
    completedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

taskSchema.index({ createdAt: -1 });
taskSchema.index({ title: 'text' });

export const Task = mongoose.model('Task', taskSchema);
