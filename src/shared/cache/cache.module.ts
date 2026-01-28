import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '@/shared/logger/logger.service';
import { ResilienceModule } from '@/shared/resilience/resilience.module';
import { CircuitBreakerService } from '@/shared/resilience/circuit-breaker.service';
import { RedisCacheService } from './implementations/redis-cache.service';
import { MemoryCacheService } from './implementations/memory-cache.service';
import { RbacCacheService } from './business/rbac-cache.service';
import { CacheService } from './cache.service';
import { ICacheService } from './interfaces/cache.interface';

/**
 * 缓存模块
 * 提供统一的缓存服务接口，支持 Redis 和内存缓存的灵活切换
 *
 * 架构设计：
 * ┌─────────────────────────────────────────┐
 * │  CacheService (通用缓存，向后兼容)       │
 * │  RbacCacheService (RBAC 专用缓存)       │
 * └─────────────────────────────────────────┘
 *            ↓ 依赖
 * ┌─────────────────────────────────────────┐
 * │  CACHE_SERVICE (统一接口)               │
 * │  ├─ RedisCacheService (Redis 可用时)    │
 * │  └─ MemoryCacheService (降级方案)       │
 * └─────────────────────────────────────────┘
 *
 * 缓存类型配置 (CACHE_TYPE):
 * - 'redis': 强制使用 Redis，连接失败则降级为内存缓存
 * - 'memory': 强制使用内存缓存
 * - 'auto': 自动选择，优先 Redis，失败时降级为内存缓存（默认）
 *
 * 使用方式：
 * - 通用缓存：注入 CacheService（向后兼容，无需修改现有代码）
 * - RBAC 缓存：注入 RbacCacheService（角色/权限缓存）
 */
@Global()
@Module({
  imports: [ResilienceModule],
  providers: [
    // Redis 客户端
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (
        configService: ConfigService,
        logger: LoggerService,
      ) => {
        const cacheType = configService.get<string>('redis.cacheType', 'auto');

        // 如果配置为强制使用内存缓存，直接返回 null
        if (cacheType === 'memory') {
          logger.log(
            '📝 配置为使用内存缓存 (CACHE_TYPE=memory)',
            'CacheModule',
          );
          return null;
        }

        // 尝试连接 Redis (cacheType 为 'redis' 或 'auto')
        try {
          const redis = new Redis({
            host: configService.get('redis.host', 'localhost'),
            port: configService.get('redis.port', 6379),
            password: configService.get('redis.password'),
            db: configService.get('redis.db', 0),
            keyPrefix: configService.get('redis.keyPrefix', 'nestjs:'),
            connectTimeout: 2000,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          });

          // 监听错误事件
          redis.on('error', error => {
            logger.warn(`Redis 连接错误: ${error.message}`);
          });

          // 尝试连接
          try {
            await redis.connect();
            logger.log(
              `✅ Redis 连接成功 (${configService.get('redis.host')}:${configService.get('redis.port')})`,
              'CacheModule',
            );
            return redis;
          } catch (connectError: any) {
            logger.warn(
              `⚠️ Redis 连接失败: ${connectError.message}`,
              'CacheModule',
            );
            redis.disconnect();

            // 无论什么环境，都允许降级为内存缓存
            logger.warn(
              `⚠️ 将自动降级使用内存缓存 (CACHE_TYPE=${cacheType})`,
              'CacheModule',
            );
            return null;
          }
        } catch (error: any) {
          logger.error(
            `⚠️ Redis 初始化失败: ${error.message}`,
            error.stack,
            'CacheModule',
          );
          logger.warn('⚠️ 将自动降级使用内存缓存', 'CacheModule');
          return null;
        }
      },
      inject: [ConfigService, LoggerService],
    },

    // 统一缓存服务（根据配置和 Redis 可用性自动选择实现）
    {
      provide: 'CACHE_SERVICE',
      useFactory: (
        redisClient: Redis | null,
        configService: ConfigService,
        logger: LoggerService,
        circuitBreaker: CircuitBreakerService,
      ): ICacheService => {
        const cacheType = configService.get<string>('redis.cacheType', 'auto');
        const nodeEnv = configService.get('app.env', 'development');

        if (redisClient) {
          logger.log('🚀 使用 Redis 缓存服务', 'CacheModule');
          return new RedisCacheService(redisClient, circuitBreaker, logger);
        }

        // Redis 不可用，使用内存缓存
        if (nodeEnv === 'production') {
          logger.warn(
            '⚠️ 生产环境使用内存缓存（不推荐，分布式部署下可能导致数据不一致）',
            'CacheModule',
          );
        } else {
          logger.log(
            `✅ 使用内存缓存服务 (CACHE_TYPE=${cacheType}, ENV=${nodeEnv})`,
            'CacheModule',
          );
        }

        return new MemoryCacheService(logger);
      },
      inject: [
        'REDIS_CLIENT',
        ConfigService,
        LoggerService,
        CircuitBreakerService,
      ],
    },

    // 通用缓存服务（向后兼容）
    CacheService,

    // RBAC 缓存服务（角色权限专用）
    RbacCacheService,
  ],
  exports: [
    CacheService, // 通用缓存（推荐，向后兼容）
    RbacCacheService, // RBAC 缓存（角色权限场景）
  ],
})
export class CacheModule {}
