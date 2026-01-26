import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Redis 配置环境变量 Schema
 */
export const redisEnvSchema = z.object({
  CACHE_TYPE: z.enum(['redis', 'memory', 'auto']).optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).optional(),
  REDIS_KEY_PREFIX: z.string().optional(),
  REDIS_TTL: z.coerce.number().int().positive().optional(),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(0).optional(),
  REDIS_RETRY_DELAY: z.coerce.number().int().positive().optional(),
  REDIS_MAX_MEMORY_POLICY: z.string().optional(),
});

export type RedisEnvConfig = z.infer<typeof redisEnvSchema>;

/**
 * Redis 缓存配置
 *
 * 缓存类型选择 (CACHE_TYPE):
 * - 'redis': 使用 Redis 缓存（推荐用于生产环境）
 * - 'memory': 使用内存缓存（仅用于开发/测试环境）
 * - 'auto': 自动选择，优先 Redis，失败时降级为内存缓存
 *
 * 自动降级策略:
 * - 如果 CACHE_TYPE='redis' 但 Redis 不可用，会自动降级为内存缓存（仅非生产环境）
 * - 生产环境下，如果配置为 'redis' 但连接失败，则会抛出错误
 */
export const redisConfig = registerAs('redis', () => ({
  // 缓存类型配置：'redis' | 'memory' | 'auto'
  cacheType: process.env.CACHE_TYPE || 'auto',

  // Redis 连接配置
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'nestjs:',
  ttl: parseInt(process.env.REDIS_TTL, 10) || 300, // 5分钟
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3,
  retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY, 10) || 100,
  maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
}));
