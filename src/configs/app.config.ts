import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Smart Bill Operation',
  port: parseInt(process.env.HTTP_PORT ?? '3333', 10),
  timezone: process.env.TIME_ZONE ?? 'Asia/Ho_Chi_Minh',
  uploadDir: process.env.FILE_FOLDER ?? 'uploads',
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.HTTP_PORT ?? '3333'}`).replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** 32+ chars secret used to AES-encrypt stored secrets (bot token, Gemini key) */
  secretKey: process.env.APP_SECRET_KEY ?? '',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? '10', 10),
}));
