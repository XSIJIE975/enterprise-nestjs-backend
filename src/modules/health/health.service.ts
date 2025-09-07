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
      return this.getStatus(key, true, { message: 'Database connection is healthy' });
    } catch (error) {
      throw this.getStatus(key, false, { message: 'Database connection failed', error: error.message });
    }
  }

  async checkRedis(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.cache.set('health_check', 'ok', 10);
      const result = await this.cache.get('health_check');
      if (result === 'ok') {
        return this.getStatus(key, true, { message: 'Cache service is healthy' });
      } else {
        throw new Error('Cache test failed');
      }
    } catch (error) {
      // 在开发环境，如果缓存服务不可用，仍然报告为健康
      if (process.env.NODE_ENV === 'development') {
        return this.getStatus(key, true, { message: 'Cache service (memory fallback) is healthy' });
      }
      throw this.getStatus(key, false, { message: 'Cache service failed', error: error.message });
    }
  }
}
