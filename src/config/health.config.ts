import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Health 配置环境变量 Schema
 */
export const healthEnvSchema = z.object({
  HEALTH_DISK_THRESHOLD: z.coerce.number().int().positive().optional(),
  HEALTH_MEMORY_HEAP: z.coerce.number().int().positive().optional(),
  HEALTH_MEMORY_RSS: z.coerce.number().int().positive().optional(),
});

export type HealthEnvConfig = z.infer<typeof healthEnvSchema>;

export const healthConfig = registerAs('health', () => ({
  disk: {
    // 最小剩余空间阈值 (字节)，默认 1GB
    threshold:
      parseInt(process.env.HEALTH_DISK_THRESHOLD, 10) || 1024 * 1024 * 1024,
  },
  memory: {
    // 堆内存阈值 (字节)，默认 500MB
    heap: parseInt(process.env.HEALTH_MEMORY_HEAP, 10) || 500 * 1024 * 1024,
    // RSS 内存阈值 (字节)，默认 800MB
    rss: parseInt(process.env.HEALTH_MEMORY_RSS, 10) || 800 * 1024 * 1024,
  },
}));
