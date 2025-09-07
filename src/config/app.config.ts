import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'Enterprise NestJS Backend',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  timezone: process.env.TZ || 'Asia/Shanghai',
  logLevel: process.env.LOG_LEVEL || 'info',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
}));
