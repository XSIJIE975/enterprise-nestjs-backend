import { Injectable, Inject } from '@nestjs/common';
import { ICacheService } from './interfaces/cache.interface';

/**
 * 通用缓存服务
 * 适用于通用场景（令牌黑名单、会话管理、临时数据等）
 * 内部根据环境自动选择 Redis 或内存实现
 *
 * 使用场景：
 * - ✅ 令牌黑名单
 * - ✅ 会话管理
 * - ✅ 临时数据缓存
 * - ✅ 接口限流计数
 *
 * 如需 RBAC 缓存（用户角色/权限），请使用 RbacCacheService
 */
@Injectable()
export class CacheService implements ICacheService {
  constructor(
    @Inject('CACHE_SERVICE')
    private readonly cache: ICacheService,
  ) {}

  async get<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<'OK' | null> {
    return this.cache.set(key, value, ttl);
  }

  async del(key: string): Promise<number> {
    return this.cache.del(key);
  }

  async delPattern(pattern: string): Promise<number> {
    return this.cache.delPattern(pattern);
  }

  async exists(key: string): Promise<number> {
    return this.cache.exists(key);
  }

  async ttl(key: string): Promise<number> {
    return this.cache.ttl(key);
  }

  async flush(): Promise<'OK'> {
    return this.cache.flush();
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return this.cache.mget(keys);
  }

  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    return this.cache.mset(keyValuePairs);
  }

  async incr(key: string): Promise<number> {
    return this.cache.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.cache.decr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.cache.expire(key, seconds);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return this.cache.getOrSet<T>(key, factory, ttl);
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return this.cache.generateKey(prefix, ...parts);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.cache.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.cache.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.cache.srem(key, ...members);
  }

  isAvailable(): boolean {
    return this.cache.isAvailable();
  }

  getType(): 'redis' | 'memory' {
    return this.cache.getType();
  }

  /**
   * @deprecated 使用 isAvailable() 替代
   */
  async ping(): Promise<string> {
    return this.isAvailable() ? 'PONG' : 'UNAVAILABLE';
  }
}
