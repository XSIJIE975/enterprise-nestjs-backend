import { registerAs } from '@nestjs/config';

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
