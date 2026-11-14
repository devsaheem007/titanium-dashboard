import mongoose from 'mongoose';

// One document (key: "app") holding the admin-managed application settings.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'app' },
    appName: { type: String, trim: true, maxlength: 40, default: 'Titanium' },
    allowRegistration: { type: Boolean, default: true },
    systemAlert: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

settingSchema.statics.getApp = async function getApp() {
  return this.findOneAndUpdate({ key: 'app' }, { $setOnInsert: { key: 'app' } }, { upsert: true, new: true });
};

export const Setting = mongoose.model('Setting', settingSchema);
