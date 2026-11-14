import mongoose from 'mongoose';
import { PROJECT_STATUSES } from '../config/constants.js';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Project name is required'], trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'planning', index: true },
    deadline: { type: Date },
    // Manual value; automatically recalculated from tasks once the project has tasks.
    progress: { type: Number, min: 0, max: 100, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

projectSchema.index({ assignedTo: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ name: 'text' });

export const Project = mongoose.model('Project', projectSchema);
