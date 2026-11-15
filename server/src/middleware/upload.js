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

export function validateAvatarSignature(req, res, next) {
  if (!req.file) return next();

  const { buffer, mimetype } = req.file;

  const isPNG =
    mimetype === 'image/png' &&
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );

  const isJPEG =
    mimetype === 'image/jpeg' &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const isWebP =
    mimetype === 'image/webp' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isPNG && !isJPEG && !isWebP) {
    return next(
      new AppError('Invalid image file. Upload a valid PNG, JPG or WebP image', 400)
    );
  }

  next();
}

export async function removeAvatarFile(avatarUrl) {
  try {
    if (!avatarUrl) return;

    const url = new URL(avatarUrl);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      !cloudName
    ) return;

    const parts = url.pathname
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent);

    if (
      parts[0] !== cloudName ||
      parts[1] !== 'image' ||
      parts[2] !== 'upload'
    ) return;

    const assetParts = parts.slice(3);

    if (/^v\d+$/.test(assetParts[0] || '')) {
      assetParts.shift();
    }

    if (
      assetParts[0] !== 'titanium' ||
      assetParts[1] !== 'avatars' ||
      assetParts.length !== 3
    ) return;

    const filename = assetParts[2];

    if (!/\.(png|jpe?g|webp)$/i.test(filename)) return;

    const publicName = filename.replace(/\.[^.]+$/i, '');

    if (!/^[a-zA-Z0-9_-]+$/.test(publicName)) return;

    const publicId = `titanium/avatars/${publicName}`;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      console.error('Avatar deletion unsuccessful:', result.result);
    }
  } catch (error) {
    console.error('Avatar deletion failed:', error.message);
  }
}
