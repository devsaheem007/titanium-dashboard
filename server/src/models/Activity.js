import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, enum: ['create', 'update', 'delete', 'login', 'register', 'security'] },
    entityType: { type: String, required: true, enum: ['user', 'project', 'task', 'auth', 'settings', 'message'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    message: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ entityType: 1, createdAt: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
