import 'dotenv/config';

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

if (process.env.JWT_SECRET.length < 32) {
  const msg = 'JWT_SECRET should be at least 32 characters long.';
  if (isProd) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`Warning: ${msg}`);
}

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresDays: Number(process.env.JWT_EXPIRES_DAYS) || 7,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Titanium <no-reply@example.com>',
  },
};
