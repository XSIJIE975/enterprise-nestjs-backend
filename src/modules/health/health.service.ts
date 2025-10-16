import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {
    super();
  }

  async checkDatabase(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true, {
        message: 'Database connection is healthy',
      });
    } catch (error: any) {
      throw this.getStatus(key, false, {
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }

  async checkRedis(key: string): Promise<HealthIndicatorResult> {
    try {
      // 检查缓存服务是否可用
      if (!this.cache.isAvailable()) {
        throw new Error('Cache service is not available');
      }

      // 测试读写操作
      await this.cache.set('health_check', 'ok', 10);
      const result = await this.cache.get('health_check');

      if (result === 'ok') {
        const cacheType = this.cache.getType();
        return this.getStatus(key, true, {
          message: `Cache service (${cacheType}) is healthy`,
          type: cacheType,
        });
      } else {
        throw new Error('Cache test failed');
      }
    } catch (error: any) {
      // 在开发环境，如果使用内存缓存，仍然报告为健康
      if (
        process.env.NODE_ENV === 'development' &&
        this.cache.getType() === 'memory'
      ) {
        return this.getStatus(key, true, {
          message: 'Cache service (memory fallback) is healthy',
          type: 'memory',
        });
      }
      throw this.getStatus(key, false, {
        message: 'Cache service failed',
        error: error.message,
      });
    }
  }
}
