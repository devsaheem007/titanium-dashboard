import cloudinary from '../config/cloudinary.js';
import multer from 'multer';
import { AppError } from '../utils/helpers.js';

const EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    cb(new AppError('Only PNG, JPG or WebP images are allowed', 400));
  },
}).single('avatar');

export function removeAvatarFile(avatarUrl) {
  if (!avatarUrl?.startsWith('https://res.cloudinary.com/')) return;

  try {
    const pathname = new URL(avatarUrl).pathname;
    const marker = '/upload/';
    const index = pathname.indexOf(marker);

    if (index === -1) return;

    let publicId = pathname.slice(index + marker.length);
    publicId = publicId.replace(/^v\d+\//, '');
    publicId = publicId.replace(/\.[^/.]+$/, '');

    cloudinary.uploader
      .destroy(publicId, { resource_type: 'image' })
      .catch((error) =>
        console.error('Avatar deletion failed:', error.message)
      );
  } catch (error) {
    console.error('Invalid avatar URL:', error.message);
  }
}
