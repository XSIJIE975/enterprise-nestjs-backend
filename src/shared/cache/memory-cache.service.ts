import { Injectable } from '@nestjs/common';

@Injectable()
export class MemoryCacheService {
  private cache = new Map<string, { value: any; expiry?: number }>();

  async get<T = any>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<'OK' | null> {
    const expiry = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.cache.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return 0;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return 0;
    }
    
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item || !item.expiry) return -1;
    
    const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async flush(): Promise<'OK'> {
    this.cache.clear();
    return 'OK';
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return keys.map(key => {
      const item = this.cache.get(key);
      if (!item) return null;
      
      if (item.expiry && Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }
      
      return JSON.stringify(item.value);
    });
  }

  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      this.cache.set(key, { value });
    });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current - 1;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return 0;
    
    item.expiry = Date.now() + seconds * 1000;
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
}
