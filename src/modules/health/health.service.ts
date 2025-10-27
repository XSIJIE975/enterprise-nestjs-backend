import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';

/**
 * 健康检查服务
 * 提供数据库和缓存服务的健康状态检查
 *
 * 使用 NestJS v11 推荐的 HealthIndicatorService API
 */
@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * 检查数据库连接健康状态
   * @param key 健康检查的键名
   * @returns 健康检查结果
   */
  async checkDatabase(key: string): Promise<HealthIndicatorResult> {
    // 开始健康检查
    const indicator = this.healthIndicatorService.check(key);

    try {
      // 执行简单的查询测试数据库连接
      await this.prisma.$queryRaw`SELECT 1`;

      // 标记为健康状态
      return indicator.up({ message: 'Database connection is healthy' });
    } catch (error: any) {
      // 标记为不健康状态
      return indicator.down({
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }

  /**
   * 检查缓存服务健康状态
   * @param key 健康检查的键名
   * @returns 健康检查结果
   */
  async checkRedis(key: string): Promise<HealthIndicatorResult> {
    // 开始健康检查
    const indicator = this.healthIndicatorService.check(key);

    try {
      // 检查缓存服务是否可用
      if (!this.cache.isAvailable()) {
        throw new Error('Cache service is not available');
      }

      // 测试读写操作
      const testKey = 'health_check';
      const testValue = 'ok';
      await this.cache.set(testKey, testValue, 10);
      const result = await this.cache.get(testKey);

      if (result === testValue) {
        const cacheType = this.cache.getType();
        return indicator.up({
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
        return indicator.up({
          message: 'Cache service (memory fallback) is healthy',
          type: 'memory',
        });
      }

      // 标记为不健康状态
      return indicator.down({
        message: 'Cache service failed',
        error: error.message,
      });
    }
  }
}
