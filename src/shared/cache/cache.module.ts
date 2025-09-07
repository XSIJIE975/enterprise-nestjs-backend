import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { MemoryCacheService } from './memory-cache.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        try {
          const redis = new Redis({
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get('REDIS_DB', 0),
            connectTimeout: 1000,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          });

          // 监听错误事件，防止未处理的错误
          redis.on('error', (error) => {
            console.warn('Redis connection error:', error.message);
          });

          // 尝试连接，如果失败返回null
          try {
            await redis.connect();
            console.log('✅ Redis connected successfully');
            return redis;
          } catch {
            console.warn('⚠️ Redis connection failed, using memory cache fallback');
            redis.disconnect();
            return null;
          }
        } catch (error) {
          console.warn('⚠️ Redis initialization failed, using memory cache:', error.message);
          return null;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: CacheService,
      useFactory: (redisClient: Redis | null) => {
        if (redisClient) {
          console.log('🚀 Using Redis cache service');
          return new CacheService(redisClient);
        } else {
          console.log('🚀 Using memory cache service');
          return new MemoryCacheService();
        }
      },
      inject: ['REDIS_CLIENT'],
    },
  ],
  exports: [CacheService, 'REDIS_CLIENT'],
})
export class CacheModule {}
