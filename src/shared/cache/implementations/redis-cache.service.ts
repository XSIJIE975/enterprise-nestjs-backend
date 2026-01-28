import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { ICacheService } from '@/shared/cache';
import { CircuitBreakerService } from '@/shared/resilience/circuit-breaker.service';
import { LoggerService } from '@/shared/logger/logger.service';

/**
 * Redis 缓存服务实现
 * 适用于生产环境和分布式部署场景
 * 集成熔断器保护 Redis 操作
 */
@Injectable()
export class RedisCacheService implements ICacheService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly logger: LoggerService,
  ) {
    if (!redis) {
      throw new Error('Redis client is required for RedisCacheService');
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，get 操作降级: ${key}`);
        return null; // 降级策略：返回 null（缓存未命中）
      }
      throw error;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<'OK' | null> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        const serializedValue = JSON.stringify(value);
        if (ttl) {
          return await this.redis.setex(key, ttl, serializedValue);
        }
        return await this.redis.set(key, serializedValue);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，set 操作降级: ${key}`);
        return null; // 降级策略：静默失败
      }
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.del(key);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，del 操作降级: ${key}`);
        return 0; // 降级策略：返回 0（未删除）
      }
      throw error;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
          return 0;
        }
        return await this.redis.del(...keys);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，delPattern 操作降级: ${pattern}`);
        return 0; // 降级策略：返回 0（未删除）
      }
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.exists(key);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，exists 操作降级: ${key}`);
        return 0; // 降级策略：返回 0（不存在）
      }
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.ttl(key);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，ttl 操作降级: ${key}`);
        return -2; // 降级策略：返回 -2（key 不存在）
      }
      throw error;
    }
  }

  async flush(): Promise<'OK'> {
    try {
      return (await this.circuitBreaker.execute('redis', async () => {
        await this.redis.flushdb();
        return 'OK' as const;
      })) as 'OK';
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，flush 操作降级`);
        return 'OK'; // 降级策略：静默失败
      }
      throw error;
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.mget(...keys);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(
          `Redis 熔断器打开，mget 操作降级: ${keys.length} keys`,
        );
        return keys.map(() => null); // 降级策略：返回全 null 数组
      }
      throw error;
    }
  }

  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        const pairs: string[] = [];
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          pairs.push(key, JSON.stringify(value));
        });
        return await this.redis.mset(...pairs);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(
          `Redis 熔断器打开，mset 操作降级: ${Object.keys(keyValuePairs).length} keys`,
        );
        return 'OK'; // 降级策略：静默失败
      }
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.incr(key);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，incr 操作降级: ${key}`);
        return 0; // 降级策略：返回 0
      }
      throw error;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.decr(key);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，decr 操作降级: ${key}`);
        return 0; // 降级策略：返回 0
      }
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.expire(key, seconds);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，expire 操作降级: ${key}`);
        return 0; // 降级策略：返回 0（未设置过期时间）
      }
      throw error;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await factory();
    await this.set(key, result, ttl);
    return result;
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.sadd(key, ...members);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，sadd 操作降级: ${key}`);
        return 0; // 降级策略：返回 0（未添加）
      }
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.smembers(key);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，smembers 操作降级: ${key}`);
        return []; // 降级策略：返回空数组
      }
      throw error;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.circuitBreaker.execute('redis', async () => {
        return await this.redis.srem(key, ...members);
      });
    } catch (error: any) {
      if (error.message?.includes('Circuit breaker is open')) {
        this.logger.warn(`Redis 熔断器打开，srem 操作降级: ${key}`);
        return 0; // 降级策略：返回 0（未删除）
      }
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.redis.status === 'ready';
  }

  getType(): 'redis' | 'memory' {
    return 'redis';
  }
}
