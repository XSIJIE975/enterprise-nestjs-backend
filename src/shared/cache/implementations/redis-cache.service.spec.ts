import { RedisCacheService } from './redis-cache.service';
import Redis from 'ioredis';

describe('Redis 缓存服务', () => {
  let service: RedisCacheService;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(() => {
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      setex: jest.fn(),
      status: 'ready',
      mget: jest.fn(),
      mset: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      srem: jest.fn(),
    } as any;

    service = new RedisCacheService(mockRedisClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('获取缓存类型', () => {
    it('应该返回 "redis"', () => {
      expect(service.getType()).toBe('redis');
    });
  });

  describe('获取缓存', () => {
    it('应该从 Redis 获取值并解析 JSON', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify('test-value'));

      const result = await service.get<string>('test-key');

      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('当键不存在时应该返回 null', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('non-existent-key');
    });

    it('应该能正确处理对象类型', async () => {
      const testObj = { name: 'John', age: 30 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testObj));

      const result = await service.get<typeof testObj>('test-obj');

      expect(result).toEqual(testObj);
    });
  });

  describe('设置缓存', () => {
    it('应该在 Redis 中设置带 TTL 的值并进行 JSON 序列化', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('test-key', 'test-value', 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        60,
        JSON.stringify('test-value'),
      );
    });

    it('当 TTL 为 0 或 undefined 时应该设置不过期的值', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('test-key', 'test-value', 0);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('test-value'),
      );
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('应该能通过 JSON 序列化处理对象值', async () => {
      const testObj = { name: 'John', age: 30 };
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('test-obj', testObj, 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-obj',
        60,
        JSON.stringify(testObj),
      );
    });
  });

  describe('删除缓存', () => {
    it('应该能从 Redis 中删除键', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('当键不存在时应该返回 0', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      const result = await service.del('non-existent-key');

      expect(result).toBe(0);
      expect(mockRedisClient.del).toHaveBeenCalledWith('non-existent-key');
    });
  });

  describe('检查键是否存在', () => {
    it('当键存在时应该返回 1', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('当键不存在时应该返回 0', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(0);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('non-existent-key');
    });
  });

  describe('获取剩余过期时间', () => {
    it('应该返回键的剩余 TTL', async () => {
      mockRedisClient.ttl.mockResolvedValue(60);

      const result = await service.ttl('test-key');

      expect(result).toBe(60);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
    });

    it('当键不存在时应该返回 -2', async () => {
      mockRedisClient.ttl.mockResolvedValue(-2);

      const result = await service.ttl('non-existent-key');

      expect(result).toBe(-2);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('non-existent-key');
    });

    it('当键无过期时间时应该返回 -1', async () => {
      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.ttl('persistent-key');

      expect(result).toBe(-1);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('persistent-key');
    });
  });

  describe('按模式删除', () => {
    it('应该能删除匹配模式的所有键', async () => {
      mockRedisClient.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);
      mockRedisClient.del.mockResolvedValue(3);

      const result = await service.delPattern('user:*');

      expect(result).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'user:1',
        'user:2',
        'user:3',
      );
    });

    it('当没有键与模式匹配时，应返回 0', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.delPattern('non-existent:*');

      expect(result).toBe(0);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('non-existent:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('生成缓存键', () => {
    it('应该能生成带前缀和后缀的键', () => {
      const key = service.generateKey('user', 123);
      expect(key).toBe('user:123');
    });

    it('应该能生成只有前缀的键（包含冒号）', () => {
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

    it('应该能处理多个部分', () => {
      const key = service.generateKey('user', 123, 'profile');
      expect(key).toBe('user:123:profile');
    });
  });

  describe('清空所有缓存', () => {
    it('应该清空当前数据库中的所有键', async () => {
      mockRedisClient.flushdb.mockResolvedValue('OK' as any);

      const result = await service.flush();

      expect(result).toBe('OK');
      expect(mockRedisClient.flushdb).toHaveBeenCalled();
    });
  });

  describe('批量获取', () => {
    it('应该能一次性获取多个键', async () => {
      mockRedisClient.mget.mockResolvedValue(['value1', 'value2', null]);

      const result = await service.mget(['key1', 'key2', 'key3']);

      expect(result).toEqual(['value1', 'value2', null]);
      expect(mockRedisClient.mget).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });
  });

  describe('批量设置', () => {
    it('应该能一次性设置多个键', async () => {
      mockRedisClient.mset.mockResolvedValue('OK');

      const result = await service.mset({ key1: 'value1', key2: 'value2' });

      expect(result).toBe('OK');
      expect(mockRedisClient.mset).toHaveBeenCalledWith(
        'key1',
        JSON.stringify('value1'),
        'key2',
        JSON.stringify('value2'),
      );
    });
  });

  describe('计数器递增和递减', () => {
    it('应该能递增计数器', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      const result = await service.incr('counter');

      expect(result).toBe(1);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('counter');
    });

    it('应该能递减计数器', async () => {
      mockRedisClient.decr.mockResolvedValue(0);

      const result = await service.decr('counter');

      expect(result).toBe(0);
      expect(mockRedisClient.decr).toHaveBeenCalledWith('counter');
    });
  });

  describe('更新过期时间', () => {
    it('应该能设置过期时间', async () => {
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.expire('test-key', 60);

      expect(result).toBe(1);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 60);
    });
  });

  describe('获取或设置', () => {
    it('如果缓存存在应该返回缓存值', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify('cached-value'));

      const factory = jest.fn();
      const result = await service.getOrSet('test-key', factory, 60);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('如果缓存不存在应该调用工厂函数并缓存结果', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue('OK');

      const factory = jest.fn().mockResolvedValue('fresh-value');
      const result = await service.getOrSet('test-key', factory, 60);

      expect(result).toBe('fresh-value');
      expect(factory).toHaveBeenCalled();
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        60,
        JSON.stringify('fresh-value'),
      );
    });
  });

  describe('集合操作', () => {
    it('应该能向集合添加成员', async () => {
      mockRedisClient.sadd.mockResolvedValue(2);

      const result = await service.sadd('myset', 'member1', 'member2');

      expect(result).toBe(2);
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'myset',
        'member1',
        'member2',
      );
    });

    it('应该能获取集合中的所有成员', async () => {
      mockRedisClient.smembers.mockResolvedValue(['member1', 'member2']);

      const result = await service.smembers('myset');

      expect(result).toEqual(['member1', 'member2']);
      expect(mockRedisClient.smembers).toHaveBeenCalledWith('myset');
    });

    it('应该能从集合中移除成员', async () => {
      mockRedisClient.srem.mockResolvedValue(1);

      const result = await service.srem('myset', 'member1');

      expect(result).toBe(1);
      expect(mockRedisClient.srem).toHaveBeenCalledWith('myset', 'member1');
    });
  });

  describe('检查缓存可用性', () => {
    it('当 Redis 就绪时应该返回 true', () => {
      mockRedisClient.status = 'ready';

      expect(service.isAvailable()).toBe(true);
    });

    it('当 Redis 未就绪时应该返回 false', () => {
      mockRedisClient.status = 'connecting';

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该能处理空字符串值', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(JSON.stringify(''));

      await service.set('empty-string', '', 60);
      const result = await service.get('empty-string');

      expect(result).toBe('');
    });

    it('应该能处理非常长的键名', async () => {
      const longKey = 'a'.repeat(1000);
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set(longKey, 'value', 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        longKey,
        60,
        JSON.stringify('value'),
      );
    });

    it('应该能处理键名中的特殊字符', async () => {
      const specialKey = 'user:@#$%^&*():123';
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set(specialKey, 'value', 60);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        specialKey,
        60,
        JSON.stringify('value'),
      );
    });
  });

  describe('并发操作', () => {
    it('应该能处理并发的设置操作', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(service.set(`concurrent:${i}`, `value${i}`, 60));
      }
      await Promise.all(promises);

      expect(mockRedisClient.setex).toHaveBeenCalledTimes(100);
    });

    it('应该能处理并发的获取操作', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify('value'));

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(service.get('concurrent-get'));
      }
      const results = await Promise.all(promises);

      expect(mockRedisClient.get).toHaveBeenCalledTimes(50);
      results.forEach(result => {
        expect(result).toBe('value');
      });
    });
  });
});
