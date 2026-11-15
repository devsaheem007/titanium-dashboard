import cloudinary from "../config/cloudinary.js";
import { User } from "../models/User.js";
import { AppError, asyncHandler } from "../utils/helpers.js";
import { removeAvatarFile } from "../middleware/upload.js";
import { logActivity } from "../services/common.js";

const publicUser = (user) => ({
  ...user.toJSON(),
  effectivePermissions: user.effectivePermissions(),
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new AppError("User not found", 404);

  const { name, email, currentPassword, theme, notificationPrefs } = req.body;

  if (email && email !== user.email) {
    if (!currentPassword || !(await user.comparePassword(currentPassword))) {
      throw new AppError(
        "Enter your current password to change your email",
        400,
        { currentPassword: "Current password is incorrect" },
      );
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (theme) user.theme = theme;

  if (notificationPrefs) {
    for (const [k, v] of Object.entries(notificationPrefs)) {
      user.notificationPrefs[k] = v;
    }
  }

  await user.save();

  if (name || email) {
    await logActivity(
      user,
      "update",
      "user",
      user._id,
      `${user.name} updated their profile`,
    );
  }

  res.json({ success: true, user: publicUser(user) });
});

export const uploadAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Choose an image to upload", 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new AppError("User not found", 404);

  const oldAvatar = user.avatar;

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "titanium/avatars",
        resource_type: "image",
      },
      (error, uploaded) => {
        if (error) reject(error);
        else resolve(uploaded);
      },
    );

    stream.end(req.file.buffer);
  });

  if (!result?.secure_url) {
    throw new AppError("Avatar upload failed", 502);
  }

  user.avatar = result.secure_url;

  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    await removeAvatarFile(result.secure_url);
    throw error;
  }

  await removeAvatarFile(oldAvatar);

  res.json({ success: true, user: publicUser(user) });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const oldAvatar = user.avatar;

  user.avatar = "";
  await user.save({ validateBeforeSave: false });

  await removeAvatarFile(oldAvatar);

  res.json({ success: true, user: publicUser(user) });
});
