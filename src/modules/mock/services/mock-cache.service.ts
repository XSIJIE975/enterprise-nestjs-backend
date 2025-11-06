import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/shared/logger/logger.service';
import { CacheService } from '@/shared/cache/cache.service';

/**
 * Mock 缓存服务（完全委托到底层 CACHE_SERVICE）
 * 与 RbacCacheService 风格一致：优先 Redis，否则使用注入实现的 memory
 */
@Injectable()
export class MockCacheService {
  private readonly PREFIX = 'mock:endpoint';
  private readonly ALL_KEY = 'mock:endpoints:all';

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {
    if (this.cacheService.getType() !== 'redis') {
      this.logger.warn(
        '⚠️ MockCacheService 当前使用内存实现，生产环境建议使用 Redis',
        'MockCacheService',
      );
    } else {
      this.logger.log(
        '✅ MockCacheService 使用 Redis 缓存',
        'MockCacheService',
      );
    }
  }

  isAvailable(): boolean {
    return this.cacheService.isAvailable();
  }

  // delegate generic cache methods to underlying ICacheService
  async get<T = unknown>(key: string): Promise<T | null> {
    return this.cacheService.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<'OK' | null> {
    return this.cacheService.set(key, value as any, ttl);
  }

  async del(key: string): Promise<number> {
    return this.cacheService.del(key);
  }

  async delPattern(pattern: string): Promise<number> {
    return this.cacheService.delPattern(pattern);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return this.cacheService.getOrSet<T>(key, factory, ttl);
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return this.cacheService.generateKey(prefix, ...parts);
  }

  // --------------- mock-specific helpers ----------------
  generateEndpointKey(path: string, method: string, version?: number) {
    const ver = version ?? 1;
    return this.generateKey(this.PREFIX, path, method, `v${ver}`);
  }

  async setEndpointCache(
    path: string,
    method: string,
    value: unknown,
    version?: number,
    ttl?: number,
  ) {
    const key = this.generateEndpointKey(path, method, version);
    return this.set(key, value, ttl);
  }

  async delEndpointCache(path: string, method: string, version?: number) {
    const key = this.generateEndpointKey(path, method, version);
    return this.del(key);
  }

  async clearAllEndpointsCache() {
    // delete any list cache and per-endpoint keys
    try {
      await this.del(this.ALL_KEY);
    } catch {
      // ignore
    }
    await this.delPattern(`${this.PREFIX}:*`);
    return { message: 'mock cache cleared' };
  }
}
