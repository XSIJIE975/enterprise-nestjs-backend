/**
 * 配置模块统一导出
 * 便于在 AppModule 中集中导入
 */
export { appConfig, appEnvSchema, type AppEnvConfig } from './app.config';
export {
  databaseConfig,
  databaseEnvSchema,
  type DatabaseEnvConfig,
} from './database.config';
export { jwtConfig, jwtEnvSchema, type JwtEnvConfig } from './jwt.config';
export {
  redisConfig,
  redisEnvSchema,
  type RedisEnvConfig,
} from './redis.config';
export {
  securityConfig,
  securityEnvSchema,
  type SecurityEnvConfig,
} from './security.config';
export {
  throttleConfig,
  throttleEnvSchema,
  type ThrottleEnvConfig,
} from './throttle.config';
export {
  uploadConfig,
  uploadEnvSchema,
  type UploadEnvConfig,
} from './upload.config';
export { mailConfig, mailEnvSchema, type MailEnvConfig } from './mail.config';
export {
  healthConfig,
  healthEnvSchema,
  type HealthEnvConfig,
} from './health.config';
