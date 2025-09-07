import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
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
