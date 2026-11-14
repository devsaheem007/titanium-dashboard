import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { AppError } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
export const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

// The extension comes from the verified mime type, never from the user's file name.
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

export const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new AppError('Only PNG, JPG or WebP images are allowed', 400)),
}).single('avatar');

export function removeAvatarFile(avatarUrl) {
  if (!avatarUrl?.startsWith('/uploads/avatars/')) return;
  const file = path.join(AVATAR_DIR, path.basename(avatarUrl));
  fs.promises.unlink(file).catch(() => {});
}
