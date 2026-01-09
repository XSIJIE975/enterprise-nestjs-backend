import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { ICacheService } from '@/shared/cache';

/**
 * Redis 缓存服务实现
 * 适用于生产环境和分布式部署场景
 */
@Injectable()
export class RedisCacheService implements ICacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    if (!redis) {
      throw new Error('Redis client is required for RedisCacheService');
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<'OK' | null> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      return await this.redis.setex(key, ttl, serializedValue);
    }
    return await this.redis.set(key, serializedValue);
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return await this.redis.del(...keys);
  }

  async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async flush(): Promise<'OK'> {
    await this.redis.flushdb();
    return 'OK';
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.redis.mget(...keys);
  }

  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    const pairs: string[] = [];
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      pairs.push(key, JSON.stringify(value));
    });
    return await this.redis.mset(...pairs);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.redis.expire(key, seconds);
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
    return await this.redis.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.redis.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.redis.srem(key, ...members);
  }

  isAvailable(): boolean {
    return this.redis.status === 'ready';
  }

  getType(): 'redis' | 'memory' {
    return 'redis';
  }
}
