import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * App 配置环境变量 Schema
 */
export const appEnvSchema = z.object({
  APP_NAME: z.string().optional(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .optional()
    .default('development'),
  PORT: z.coerce.number().int().positive().optional(),
  HOST: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  API_PREFIX: z.string().optional(),
  TZ: z.string().optional(),
  APP_TIMEZONE: z.string().optional(),
  // Body limit
  BODY_LIMIT_JSON: z.string().optional(),
  BODY_LIMIT_URLENCODED: z.string().optional(),
  BODY_LIMIT_RAW: z.string().optional(),
  BODY_LIMIT_TEXT: z.string().optional(),
  // Swagger
  SWAGGER_ENABLED: z.string().optional(),
  SWAGGER_AUTH_ENABLED: z.string().optional(),
  SWAGGER_USERNAME: z.string().optional(),
  SWAGGER_PASSWORD: z.string().optional(),
  // Log
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).optional(),
  LOG_DIR: z.string().optional(),
  LOG_MAX_FILES: z.string().optional(),
  LOG_MAX_SIZE: z.string().optional(),
  LOG_DATE_PATTERN: z.string().optional(),
  LOG_ZIPPED_ARCHIVE: z.string().optional(),
  LOG_ENABLE_DATABASE: z.string().optional(),
  LOG_ENABLE_CONSOLE: z.string().optional(),
  LOG_DB_RETENTION_DAYS: z.coerce.number().int().positive().optional(),
});

export type AppEnvConfig = z.infer<typeof appEnvSchema>;

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'Enterprise NestJS Backend',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8000,
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:8000',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  timezone: process.env.TZ || 'Asia/Shanghai',
  // 应用默认时区，用于响应数据的时区转换
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Shanghai',

  // 请求体大小限制配置
  bodyLimit: {
    /** JSON 请求体大小限制 (application/json) */
    json: process.env.BODY_LIMIT_JSON || '10mb',
    /** URL 编码表单大小限制 (application/x-www-form-urlencoded) */
    urlencoded: process.env.BODY_LIMIT_URLENCODED || '10mb',
    /** 原始请求体大小限制 (application/octet-stream) */
    raw: process.env.BODY_LIMIT_RAW || '10mb',
    /** 文本请求体大小限制 (text/plain) */
    text: process.env.BODY_LIMIT_TEXT || '10mb',
  },

  // Swagger 文档认证配置
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false', // 是否启用 Swagger
    authEnabled: process.env.SWAGGER_AUTH_ENABLED === 'true', // 是否启用认证
    username: process.env.SWAGGER_USERNAME || 'admin', // 访问用户名
    password: process.env.SWAGGER_PASSWORD || 'admin123', // 访问密码
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs', // 日志文件存储目录
    maxFiles: process.env.LOG_MAX_FILES || '14d', // 日志文件保留时间
    maxSize: process.env.LOG_MAX_SIZE || '20m', // 单个日志文件大小
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD', // 日志文件日期格式
    zippedArchive: process.env.LOG_ZIPPED_ARCHIVE === 'true', // 是否压缩归档
    enableDatabase: process.env.LOG_ENABLE_DATABASE === 'true', // 是否记录到数据库
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false', // 是否输出到控制台
    databaseRetentionDays:
      parseInt(process.env.LOG_DB_RETENTION_DAYS, 10) || 30, // 数据库日志保留天数
  },
}));
