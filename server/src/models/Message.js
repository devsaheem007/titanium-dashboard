import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, read: 1 });

export const Message = mongoose.model('Message', messageSchema);
