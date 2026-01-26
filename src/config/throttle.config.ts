import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Throttle 配置环境变量 Schema
 */
export const throttleEnvSchema = z.object({
  // Short
  THROTTLE_SHORT_TTL: z.coerce.number().int().positive().optional(),
  THROTTLE_SHORT_LIMIT: z.coerce.number().int().positive().optional(),
  // Medium
  THROTTLE_MEDIUM_TTL: z.coerce.number().int().positive().optional(),
  THROTTLE_MEDIUM_LIMIT: z.coerce.number().int().positive().optional(),
  // Long
  THROTTLE_LONG_TTL: z.coerce.number().int().positive().optional(),
  THROTTLE_LONG_LIMIT: z.coerce.number().int().positive().optional(),
});

export type ThrottleEnvConfig = z.infer<typeof throttleEnvSchema>;

/**
 * 限流配置
 * 用于 API 请求速率限制
 */
export const throttleConfig = registerAs('throttle', () => ({
  // 短时限流（秒级）
  short: {
    ttl: parseInt(process.env.THROTTLE_SHORT_TTL, 10) || 1000, // 1秒
    limit: parseInt(process.env.THROTTLE_SHORT_LIMIT, 10) || 20, // 20次
  },

  // 中时限流（分钟级）
  medium: {
    ttl: parseInt(process.env.THROTTLE_MEDIUM_TTL, 10) || 60000, // 1分钟
    limit: parseInt(process.env.THROTTLE_MEDIUM_LIMIT, 10) || 200, // 200次
  },

  // 长时限流（小时级）
  long: {
    ttl: parseInt(process.env.THROTTLE_LONG_TTL, 10) || 3600000, // 1小时
    limit: parseInt(process.env.THROTTLE_LONG_LIMIT, 10) || 2000, // 2000次
  },
}));
