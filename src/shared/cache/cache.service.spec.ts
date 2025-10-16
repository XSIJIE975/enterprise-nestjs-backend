import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ICacheService } from './interfaces/cache.interface';

describe('缓存服务', () => {
  let service: CacheService;
  let mockCacheService: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    // Mock ICacheService
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      delPattern: jest.fn(),
      flush: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      getOrSet: jest.fn(),
      generateKey: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      srem: jest.fn(),
      isAvailable: jest.fn(),
      getType: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'CACHE_SERVICE',
          useValue: mockCacheService,
        },
        CacheService,
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('获取缓存', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.get.mockResolvedValue('test-value');

      const result = await service.get<string>('test-key');

      expect(result).toBe('test-value');
      expect(mockCacheService.get).toHaveBeenCalledWith('test-key');
    });
  });

  describe('设置缓存', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.set.mockResolvedValue('OK');

      const result = await service.set('test-key', 'test-value', 60);

      expect(result).toBe('OK');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        60,
      );
    });
  });

  describe('删除缓存', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.del.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockCacheService.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('检查键是否存在', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(1);
      expect(mockCacheService.exists).toHaveBeenCalledWith('test-key');
    });
  });

  describe('获取剩余过期时间', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.ttl.mockResolvedValue(60);

      const result = await service.ttl('test-key');

      expect(result).toBe(60);
      expect(mockCacheService.ttl).toHaveBeenCalledWith('test-key');
    });
  });

  describe('按模式删除', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.delPattern.mockResolvedValue(3);

      const result = await service.delPattern('user:*');

      expect(result).toBe(3);
      expect(mockCacheService.delPattern).toHaveBeenCalledWith('user:*');
    });
  });

  describe('清空所有缓存', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.flush.mockResolvedValue('OK');

      const result = await service.flush();

      expect(result).toBe('OK');
      expect(mockCacheService.flush).toHaveBeenCalled();
    });
  });

  describe('批量获取', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.mget.mockResolvedValue(['value1', 'value2']);

      const result = await service.mget(['key1', 'key2']);

      expect(result).toEqual(['value1', 'value2']);
      expect(mockCacheService.mget).toHaveBeenCalledWith(['key1', 'key2']);
    });
  });

  describe('批量设置', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.mset.mockResolvedValue('OK');

      const result = await service.mset({ key1: 'value1', key2: 'value2' });

      expect(result).toBe('OK');
      expect(mockCacheService.mset).toHaveBeenCalledWith({
        key1: 'value1',
        key2: 'value2',
      });
    });
  });

  describe('计数器递增', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.incr.mockResolvedValue(1);

      const result = await service.incr('counter');

      expect(result).toBe(1);
      expect(mockCacheService.incr).toHaveBeenCalledWith('counter');
    });
  });

  describe('计数器递减', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.decr.mockResolvedValue(0);

      const result = await service.decr('counter');

      expect(result).toBe(0);
      expect(mockCacheService.decr).toHaveBeenCalledWith('counter');
    });
  });

  describe('更新过期时间', () => {
    it('应该委托给底层缓存服务', async () => {
      mockCacheService.expire.mockResolvedValue(1);

      const result = await service.expire('test-key', 60);

      expect(result).toBe(1);
      expect(mockCacheService.expire).toHaveBeenCalledWith('test-key', 60);
    });
  });

  describe('获取或设置', () => {
    it('应该委托给底层缓存服务', async () => {
      const factory = jest.fn().mockResolvedValue('fresh-value');
      mockCacheService.getOrSet.mockResolvedValue('fresh-value');

      const result = await service.getOrSet('test-key', factory, 60);

      expect(result).toBe('fresh-value');
      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        'test-key',
        factory,
        60,
      );
    });
  });

  describe('生成缓存键', () => {
    it('应该委托给底层缓存服务', () => {
      mockCacheService.generateKey.mockReturnValue('user:123');

      const result = service.generateKey('user', 123);

      expect(result).toBe('user:123');
      expect(mockCacheService.generateKey).toHaveBeenCalledWith('user', 123);
    });
  });

  describe('集合操作', () => {
    it('sadd 应该委托给底层缓存服务', async () => {
      mockCacheService.sadd.mockResolvedValue(2);

      const result = await service.sadd('myset', 'member1', 'member2');

      expect(result).toBe(2);
      expect(mockCacheService.sadd).toHaveBeenCalledWith(
        'myset',
        'member1',
        'member2',
      );
    });

    it('smembers 应该委托给底层缓存服务', async () => {
      mockCacheService.smembers.mockResolvedValue(['member1', 'member2']);

      const result = await service.smembers('myset');

      expect(result).toEqual(['member1', 'member2']);
      expect(mockCacheService.smembers).toHaveBeenCalledWith('myset');
    });

    it('srem 应该委托给底层缓存服务', async () => {
      mockCacheService.srem.mockResolvedValue(1);

      const result = await service.srem('myset', 'member1');

      expect(result).toBe(1);
      expect(mockCacheService.srem).toHaveBeenCalledWith('myset', 'member1');
    });
  });

  describe('检查缓存可用性', () => {
    it('应该委托给底层缓存服务', () => {
      mockCacheService.isAvailable.mockReturnValue(true);

      const result = service.isAvailable();

      expect(result).toBe(true);
      expect(mockCacheService.isAvailable).toHaveBeenCalled();
    });
  });

  describe('获取缓存类型', () => {
    it('应该委托给底层缓存服务', () => {
      mockCacheService.getType.mockReturnValue('redis');

      const result = service.getType();

      expect(result).toBe('redis');
      expect(mockCacheService.getType).toHaveBeenCalled();
    });
  });
});
