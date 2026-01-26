import { z } from 'zod';
import {
  appEnvSchema,
  databaseEnvSchema,
  jwtEnvSchema,
  redisEnvSchema,
  securityEnvSchema,
  throttleEnvSchema,
  uploadEnvSchema,
  mailEnvSchema,
  healthEnvSchema,
} from '@/config';

/**
 * 配置验证结果
 */
interface ConfigValidationResult {
  success: boolean;
  errors: Array<{
    configName: string;
    issues: z.ZodIssue[];
  }>;
}

/**
 * 所有配置 schema 映射
 */
const configSchemas = {
  app: appEnvSchema,
  database: databaseEnvSchema,
  jwt: jwtEnvSchema,
  redis: redisEnvSchema,
  security: securityEnvSchema,
  throttle: throttleEnvSchema,
  upload: uploadEnvSchema,
  mail: mailEnvSchema,
  health: healthEnvSchema,
} as const;

/**
 * 验证所有配置
 * @returns 验证结果
 */
function validateAllConfigs(): ConfigValidationResult {
  const errors: ConfigValidationResult['errors'] = [];

  for (const [configName, schema] of Object.entries(configSchemas)) {
    const result = schema.safeParse(process.env);

    if (!result.success) {
      errors.push({
        configName,
        issues: result.error.issues,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * 格式化验证错误信息
 */
function formatValidationErrors(
  errors: ConfigValidationResult['errors'],
): string {
  const lines: string[] = ['Configuration validation failed:'];

  for (const { configName, issues } of errors) {
    lines.push(`\n  [${configName}]:`);
    for (const issue of issues) {
      const path = issue.path.join('.');
      lines.push(`    - ${path}: ${issue.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * 启动时验证配置
 *
 * - 开发环境：验证失败输出 console.warn，应用继续运行
 * - 生产环境：验证失败输出 console.error + process.exit(1)
 */
export function validateConfigOnStartup(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const result = validateAllConfigs();

  if (!result.success) {
    const errorMessage = formatValidationErrors(result.errors);

    if (isProduction) {
      console.error('❌ ' + errorMessage);
      console.error(
        '\n❌ Application cannot start in production with invalid configuration.',
      );
      process.exit(1);
    } else {
      console.warn('⚠️ ' + errorMessage);
      console.warn(
        '\n⚠️ Application will continue in development mode with default values.',
      );
    }
  } else {
    console.log('✅ All configuration validated successfully.');
  }
}

/**
 * 导出 schema 以便单独使用
 */
export { configSchemas };
