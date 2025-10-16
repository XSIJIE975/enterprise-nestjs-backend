import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { ICacheService } from '../interfaces/cache.interface';
import { LoggerService } from '@/shared/logger/logger.service';

/**
 * 内存缓存服务实现（基于 LRU Cache）
 * ⚠️ 警告：仅适用于开发环境和单实例部署
 * 在分布式环境下，此实现会导致数据不一致问题
 * 生产环境请使用 RedisCacheService
 *
 * 特性：
 * - LRU 淘汰策略，自动清理最少使用的缓存
 * - 支持 TTL 过期时间
 * - 支持最大缓存条目数限制
 * - 内存占用可控
 */
@Injectable()
export class MemoryCacheService implements ICacheService {
  private readonly cache: LRUCache<string, any>;
  private readonly sets = new Map<string, Set<string>>();

  // LRU 缓存配置
  private readonly MAX_ITEMS = 10000; // 最大缓存条目数
  private readonly DEFAULT_TTL = 3600 * 1000; // 默认 1 小时（毫秒）

  constructor(private readonly logger: LoggerService) {
    this.cache = new LRUCache<string, any>({
      max: this.MAX_ITEMS,
      ttl: this.DEFAULT_TTL,
      updateAgeOnGet: true, // 访问时更新年龄
      updateAgeOnHas: false,
      allowStale: false, // 不返回过期数据
    });

    this.logger.log(
      `内存缓存服务初始化完成 (max: ${this.MAX_ITEMS}, ttl: ${this.DEFAULT_TTL / 1000}s)`,
      'MemoryCacheService',
    );
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = this.cache.get(key);
    return value !== undefined ? value : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<'OK' | null> {
    const options = ttl ? { ttl: ttl * 1000 } : {}; // 转换为毫秒
    this.cache.set(key, value, options);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.cache.delete(key);
    this.sets.delete(key);
    return deleted ? 1 : 0;
  }

  async delPattern(pattern: string): Promise<number> {
    // 简单的模式匹配实现（支持 * 通配符）
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    let count = 0;

    // LRUCache 的 keys() 返回迭代器
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.sets.delete(key);
        count++;
      }
    }

    return count;
  }

  async exists(key: string): Promise<number> {
    return this.cache.has(key) ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    const remainingTtl = this.cache.getRemainingTTL(key);

    // 返回值：-2 表示不存在，-1 表示没有过期时间，>0 表示剩余秒数
    if (remainingTtl === 0) return -2; // 键不存在或已过期
    if (remainingTtl === Infinity) return -1; // 没有设置过期时间

    return Math.ceil(remainingTtl / 1000); // 转换为秒
  }

  async flush(): Promise<'OK'> {
    this.cache.clear();
    this.sets.clear();
    this.logger.warn('内存缓存已全部清空', 'MemoryCacheService');
    return 'OK';
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return keys.map(key => {
      const value = this.cache.get(key);
      if (value === undefined) return null;
      return JSON.stringify(value);
    });
  }

  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      this.cache.set(key, value);
    });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current - 1;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.cache.has(key)) return 0;

    const value = this.cache.get(key);
    this.cache.set(key, value, { ttl: seconds * 1000 });
    return 1;
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

  // 集合操作
  async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set<string>();
      this.sets.set(key, set);
    }

    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }

    return added;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) {
      return 0;
    }

    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }

    if (set.size === 0) {
      this.sets.delete(key);
    }

    return removed;
  }

  isAvailable(): boolean {
    return true;
  }

  getType(): 'redis' | 'memory' {
    return 'memory';
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
      calculatedSize: this.cache.calculatedSize,
    };
  }
}
