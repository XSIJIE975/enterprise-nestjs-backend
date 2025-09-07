import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis | null) {}

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(
    key: string,
    value: any,
    ttl?: number,
  ): Promise<'OK' | null> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      return await this.redis.setex(key, ttl, serializedValue);
    }
    return await this.redis.set(key, serializedValue);
  }

  async del(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.exists(key);
  }

  async ttl(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.ttl(key);
  }
  
  async ping(): Promise<string> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.ping();
  }

  async flush(): Promise<'OK'> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    await this.redis.flushdb();
    return 'OK';
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.mget(...keys);
  }

  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    const pairs: string[] = [];
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      pairs.push(key, JSON.stringify(value));
    });
    return await this.redis.mset(...pairs);
  }

  async incr(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.incr(key);
  }

  async decr(key: string): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.decr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis client is not available');
    }
    return await this.redis.expire(key, seconds);
  }

  // 缓存装饰器辅助方法
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

  // 生成缓存键的辅助方法
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}
