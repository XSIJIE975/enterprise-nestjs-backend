import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@/shared/logger/logger.service';
import { MemoryCacheService } from './memory-cache.service';

describe('内存缓存服务', () => {
  let service: MemoryCacheService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Mock LoggerService
    const mockLoggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    loggerService = module.get(LoggerService);
    service = new MemoryCacheService(loggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('获取缓存类型', () => {
    it('应该返回 "memory"', () => {
      expect(service.getType()).toBe('memory');
    });
  });

  describe('设置和获取缓存', () => {
    it('应该能设置和获取字符串值', async () => {
      await service.set('test-key', 'test-value', 60);
      const value = await service.get<string>('test-key');
      expect(value).toBe('test-value');
    });

    it('应该能设置和获取对象值', async () => {
      const testObj = { name: 'John', age: 30 };
      await service.set('test-obj', JSON.stringify(testObj), 60);
      const value = await service.get<string>('test-obj');
      expect(JSON.parse(value!)).toEqual(testObj);
    });

    it('对于不存在的键应该返回 null', async () => {
      const value = await service.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('对于已过期的键应该返回 null', async () => {
      // 设置 TTL 为 1 秒
      await service.set('expired-key', 'value', 1);

      // 等待 1.1 秒后尝试获取
      await new Promise(resolve => setTimeout(resolve, 1100));

      const value = await service.get('expired-key');
      expect(value).toBeNull();
    });

    it('应该正确处理 TTL 为 0 的情况', async () => {
      await service.set('no-expire-key', 'value', 0);
      const value = await service.get('no-expire-key');
      expect(value).toBe('value');
    });
  });

  describe('删除缓存', () => {
    it('应该能删除已存在的键', async () => {
      await service.set('delete-key', 'value', 60);
      const deleted = await service.del('delete-key');
      expect(deleted).toBe(1);

      const value = await service.get('delete-key');
      expect(value).toBeNull();
    });

    it('对于不存在的键应该返回 0', async () => {
      const deleted = await service.del('non-existent-key');
      expect(deleted).toBe(0);
    });
  });

  describe('检查键是否存在', () => {
    it('对于存在的键应该返回 1', async () => {
      await service.set('exist-key', 'value', 60);
      const exists = await service.exists('exist-key');
      expect(exists).toBe(1);
    });

    it('对于不存在的键应该返回 0', async () => {
      const exists = await service.exists('non-existent-key');
      expect(exists).toBe(0);
    });
  });

  describe('获取剩余过期时间', () => {
    it('应该返回键的剩余 TTL', async () => {
      await service.set('ttl-key', 'value', 60);
      const ttl = await service.ttl('ttl-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('对于无过期时间的键应该返回 -1', async () => {
      await service.set('no-expire-key', 'value', 0);
      const ttl = await service.ttl('no-expire-key');
      expect(ttl).toBe(-1);
    });

    it('对于不存在的键应该返回 -2', async () => {
      const ttl = await service.ttl('non-existent-key');
      expect(ttl).toBe(-2);
    });
  });

  describe('更新过期时间', () => {
    it('应该能更新已存在键的 TTL', async () => {
      await service.set('expire-key', 'value', 10);
      const updated = await service.expire('expire-key', 60);
      expect(updated).toBe(1);

      const ttl = await service.ttl('expire-key');
      expect(ttl).toBeGreaterThan(10);
    });

    it('对于不存在的键应该返回 0', async () => {
      const updated = await service.expire('non-existent-key', 60);
      expect(updated).toBe(0);
    });
  });

  describe('按模式删除', () => {
    it('应该能删除匹配模式的所有键', async () => {
      await service.set('user:1', 'John', 60);
      await service.set('user:2', 'Jane', 60);
      await service.set('post:1', 'Post', 60);

      const deleted = await service.delPattern('user:*');
      expect(deleted).toBeGreaterThanOrEqual(2);

      const user1 = await service.get('user:1');
      const user2 = await service.get('user:2');
      const post1 = await service.get('post:1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post1).toBe('Post');
    });

    it('对于没有匹配的模式应该返回 0', async () => {
      const deleted = await service.delPattern('non-existent:*');
      expect(deleted).toBe(0);
    });
  });

  describe('生成缓存键', () => {
    it('应该能生成带前缀和后缀的键', () => {
      const key = service.generateKey('user', 123);
      expect(key).toBe('user:123');
    });

    it('应该能生成只有前缀的键', () => {
      const key = service.generateKey('session');
      expect(key).toBe('session:');
    });

    it('应该能处理数字类型的后缀', () => {
      const key = service.generateKey('order', 456);
      expect(key).toBe('order:456');
    });

    it('应该能处理字符串类型的后缀', () => {
      const key = service.generateKey('cache', 'abc123');
      expect(key).toBe('cache:abc123');
    });
  });

  describe('清空所有缓存', () => {
    it('应该清空所有缓存条目', async () => {
      await service.set('key1', 'value1', 60);
      await service.set('key2', 'value2', 60);
      await service.set('key3', 'value3', 60);

      await service.flush();

      const key1 = await service.get('key1');
      const key2 = await service.get('key2');
      const key3 = await service.get('key3');

      expect(key1).toBeNull();
      expect(key2).toBeNull();
      expect(key3).toBeNull();
    });
  });

  describe('LRU 淘汰机制', () => {
    it('应该使用 LRU 缓存在内存中存储项目', async () => {
      // MemoryCacheService 使用 LRU cache，默认 max: 10000
      // 添加一些项目并验证可以正常存取
      await service.set('key1', 'value1', 60);
      await service.set('key2', 'value2', 60);
      await service.set('key3', 'value3', 60);

      // 验证都存在
      expect(await service.get('key1')).toBe('value1');
      expect(await service.get('key2')).toBe('value2');
      expect(await service.get('key3')).toBe('value3');
    });
  });

  describe('并发操作', () => {
    it('应该能处理并发的设置操作', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(service.set(`concurrent:${i}`, `value${i}`, 60));
      }
      await Promise.all(promises);

      // 验证一些键被正确设置
      const value0 = await service.get('concurrent:0');
      const value50 = await service.get('concurrent:50');
      const value99 = await service.get('concurrent:99');

      expect(value0).toBe('value0');
      expect(value50).toBe('value50');
      expect(value99).toBe('value99');
    });

    it('应该能处理并发的获取操作', async () => {
      await service.set('concurrent-get', 'value', 60);

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(service.get('concurrent-get'));
      }
      const results = await Promise.all(promises);

      // 所有结果都应该相同
      results.forEach(result => {
        expect(result).toBe('value');
      });
    });
  });

  describe('边界情况', () => {
    it('应该能处理空字符串值', async () => {
      await service.set('empty-string', '', 60);
      const value = await service.get('empty-string');
      expect(value).toBe('');
    });

    it('应该能处理 null 值', async () => {
      await service.set('null-value', null as any, 60);
      const value = await service.get('null-value');
      expect(value).toBeNull();
    });

    it('应该能处理 undefined 值', async () => {
      await service.set('undefined-value', undefined as any, 60);
      const value = await service.get('undefined-value');
      // undefined 在存储时会变成 null
      expect(value).toBeNull();
    });

    it('应该能处理非常长的键名', async () => {
      const longKey = 'a'.repeat(1000);
      await service.set(longKey, 'value', 60);
      const value = await service.get(longKey);
      expect(value).toBe('value');
    });

    it('应该能处理非常长的值', async () => {
      const longValue = 'x'.repeat(100000);
      await service.set('long-value', longValue, 60);
      const value = await service.get('long-value');
      expect(value).toBe(longValue);
    });
  });
});
