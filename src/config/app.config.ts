import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'Enterprise NestJS Backend',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  timezone: process.env.TZ || 'Asia/Shanghai',
  // 应用默认时区，用于响应数据的时区转换
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Shanghai',

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

  // 请求超时配置
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000, // 30秒
}));
