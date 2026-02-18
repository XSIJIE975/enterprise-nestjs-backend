import { Logger } from '@nestjs/common';
import 'reflect-metadata';
import { Retryable } from '../decorators/retryable.decorator';
import { Idempotent, IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

describe('Retryable Decorator', () => {
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock Logger 方法
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('幂等检查', () => {
    it('未标记 @Idempotent 应抛出错误', () => {
      expect(() => {
        class TestService {
          @Retryable({ maxRetries: 3 })
          async method() {
            return 'test';
          }
        }
        new TestService();
      }).toThrow('must be marked with @Idempotent()');
    });

    it('标记 @Idempotent 应正常创建（@Retryable 在上 @Idempotent 在下）', () => {
      expect(() => {
        class TestService {
          @Retryable({ maxRetries: 3 })
          @Idempotent()
          async method() {
            return 'test';
          }
        }
        new TestService();
      }).not.toThrow();
    });
  });

  describe('基本重试逻辑', () => {
    it('首次尝试成功应返回结果', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      class TestService {
        @Retryable({ maxRetries: 3, initialDelay: 10 })
        @Idempotent()
        async successMethod() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.successMethod();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('重试后成功应返回结果', async () => {
      let attempts = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('retry');
        }
        return 'success';
      });

      class TestService {
        @Retryable({ maxRetries: 3, initialDelay: 10 })
        @Idempotent()
        async retryMethod() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.retryMethod();

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('所有重试失败应抛出最后错误', async () => {
      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('always fail');
      });

      class TestService {
        @Retryable({ maxRetries: 2, initialDelay: 10 })
        @Idempotent()
        async failMethod() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.failMethod()).rejects.toThrow('always fail');
      expect(mockFn).toHaveBeenCalledTimes(3); // 初始 + 2次重试
    });

    it('应正确传递参数到原方法', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async methodWithArgs(a: string, b: number) {
          return mockFn(a, b);
        }
      }

      const service = new TestService();
      const result = await service.methodWithArgs('hello', 42);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('hello', 42);
    });

    it('应保持 this 上下文', async () => {
      class TestService {
        private value = 'instance value';

        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async getInstanceValue() {
          return this.value;
        }
      }

      const service = new TestService();
      const result = await service.getInstanceValue();

      expect(result).toBe('instance value');
    });
  });

  describe('指数退避延迟', () => {
    it('应按指数增长延迟 (100ms → 200ms → 400ms)', async () => {
      const delays: number[] = [];

      // 模拟 setTimeout 来捕获延迟值
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          if (delay && delay > 0) {
            delays.push(delay);
          }
          // 立即执行以加速测试
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 100,
          backoffMultiplier: 2,
          timeout: 100000, // 大超时以避免超时逻辑
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 验证延迟序列: 100ms, 200ms, 400ms
      expect(delays).toEqual([100, 200, 400]);

      setTimeoutSpy.mockRestore();
    });

    it('应支持自定义 backoffMultiplier', async () => {
      const delays: number[] = [];

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          if (delay && delay > 0) {
            delays.push(delay);
          }
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 50,
          backoffMultiplier: 3,
          timeout: 100000,
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 验证延迟序列: 50ms, 150ms, 450ms (50 * 3^0, 50 * 3^1, 50 * 3^2)
      expect(delays).toEqual([50, 150, 450]);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('超时限制', () => {
    it('应在总超时后停止重试', async () => {
      let attempts = 0;
      let currentTime = 0;

      // 模拟 Date.now() 来控制时间流逝
      const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        return currentTime;
      });

      // 模拟 setTimeout，每次调用增加时间
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          currentTime += delay || 0;
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        currentTime += 50; // 模拟每次调用耗时 50ms
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 100, // 大量重试
          initialDelay: 100,
          timeout: 500, // 短超时
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 由于超时限制，不应重试100次
      expect(attempts).toBeLessThan(10);

      dateNowSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('剩余时间不足以等待延迟时应立即失败', async () => {
      let attempts = 0;
      let currentTime = 0;

      const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        return currentTime;
      });

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          currentTime += delay || 0;
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 10,
          initialDelay: 200,
          timeout: 150, // 超时小于初始延迟
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow('fail');

      // 由于延迟大于剩余时间，只会尝试一次
      expect(attempts).toBe(1);

      dateNowSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('剩余时间不足时应抛出最后错误并记录日志', async () => {
      let currentTime = 0;

      const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        return currentTime;
      });

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          currentTime += delay || 0;
          fn();
          return 0 as any;
        });

      // 方法执行后剩余时间不足以等待下次延迟
      const mockFn = jest.fn().mockImplementation(async () => {
        currentTime += 50; // 模拟耗时操作
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 10,
          initialDelay: 100, // 延迟大于剩余时间
          timeout: 100, // 第一次尝试后剩余 50ms < 100ms 延迟
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      // 第一次尝试: 耗时50ms, remainingTime=50ms, delay=100ms >= remainingTime
      // 抛出 lastError
      await expect(service.method()).rejects.toThrow('fail');

      // 验证记录了"不够时间重试"的日志
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not enough time'),
      );

      dateNowSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('可重试错误过滤', () => {
    class RetryableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RetryableError';
      }
    }

    class NonRetryableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NonRetryableError';
      }
    }

    it('指定的错误类型应触发重试', async () => {
      let attempts = 0;

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new RetryableError('retry me');
        }
        return 'success';
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 10,
          retryableErrors: [RetryableError],
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBe('success');
      expect(attempts).toBe(3);

      setTimeoutSpy.mockRestore();
    });

    it('非指定的错误类型应立即抛出不重试', async () => {
      let attempts = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new NonRetryableError('do not retry');
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 10,
          retryableErrors: [RetryableError],
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow('do not retry');
      expect(attempts).toBe(1); // 只尝试一次，不重试
    });

    it('空 retryableErrors 数组应重试所有错误', async () => {
      let attempts = 0;

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new NonRetryableError('any error');
        }
        return 'success';
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 10,
          retryableErrors: [], // 空数组，默认重试所有
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBe('success');
      expect(attempts).toBe(2);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('日志记录', () => {
    it('重试时应记录警告日志', async () => {
      let attempts = 0;

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('temporary failure');
        }
        return 'success';
      });

      class TestService {
        @Retryable({ maxRetries: 3, initialDelay: 10 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      await service.method();

      // 验证重试日志
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt'),
      );

      setTimeoutSpy.mockRestore();
    });

    it('成功重试后应记录成功日志', async () => {
      let attempts = 0;

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('temporary failure');
        }
        return 'success';
      });

      class TestService {
        @Retryable({ maxRetries: 3, initialDelay: 10 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      await service.method();

      // 验证成功日志（在重试后成功）
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Succeeded on attempt'),
      );

      setTimeoutSpy.mockRestore();
    });

    it('所有重试失败应记录错误日志', async () => {
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('always fail');
      });

      class TestService {
        @Retryable({ maxRetries: 2, initialDelay: 10 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 验证错误日志
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('All retry attempts'),
      );

      setTimeoutSpy.mockRestore();
    });

    it('非可重试错误应记录警告日志', async () => {
      class SpecificError extends Error {}

      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('not retryable');
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 10,
          retryableErrors: [SpecificError],
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 验证非可重试错误日志
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not retryable'),
      );
    });

    it('剩余时间不足时应记录警告日志', async () => {
      let currentTime = 0;

      const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        return currentTime;
      });

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          currentTime += delay || 0;
          fn();
          return 0 as any;
        });

      // 方法执行后剩余时间不足以等待下次延迟
      const mockFn = jest.fn().mockImplementation(async () => {
        currentTime += 60;
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 3,
          initialDelay: 100,
          timeout: 100,
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow('fail');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not enough time'),
      );

      dateNowSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('配置选项', () => {
    it('应使用默认配置', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      class TestService {
        @Retryable()
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBe('success');
    });

    it('应支持自定义 maxRetries', async () => {
      let attempts = 0;

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 5,
          initialDelay: 10,
          timeout: 100000,
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 初始 + 5次重试 = 6次
      expect(attempts).toBe(6);

      setTimeoutSpy.mockRestore();
    });

    it('应支持部分配置覆盖', async () => {
      const delays: number[] = [];

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, delay?: number) => {
          if (delay && delay > 0) {
            delays.push(delay);
          }
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async () => {
        throw new Error('fail');
      });

      class TestService {
        @Retryable({
          maxRetries: 2,
          // 使用默认 initialDelay: 100, backoffMultiplier: 2
        })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow();

      // 验证使用默认值：100ms, 200ms
      expect(delays).toEqual([100, 200]);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('边界条件', () => {
    it('maxRetries 为 0 时不应重试', async () => {
      let attempts = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        throw new Error('fail');
      });

      class TestService {
        @Retryable({ maxRetries: 0 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();

      await expect(service.method()).rejects.toThrow('fail');
      expect(attempts).toBe(1); // 只有初始尝试
    });

    it('应正确处理 undefined 返回值', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBeUndefined();
    });

    it('应正确处理 null 返回值', async () => {
      const mockFn = jest.fn().mockResolvedValue(null);

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBeNull();
    });

    it('应正确处理 false 返回值', async () => {
      const mockFn = jest.fn().mockResolvedValue(false);

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBe(false);
    });

    it('应正确处理空字符串返回值', async () => {
      const mockFn = jest.fn().mockResolvedValue('');

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBe('');
    });

    it('应正确处理数字 0 返回值', async () => {
      const mockFn = jest.fn().mockResolvedValue(0);

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toBe(0);
    });

    it('应正确处理复杂对象返回值', async () => {
      const complexObject = {
        id: 1,
        nested: { value: 'test' },
        array: [1, 2, 3],
      };
      const mockFn = jest.fn().mockResolvedValue(complexObject);

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method() {
          return mockFn();
        }
      }

      const service = new TestService();
      const result = await service.method();

      expect(result).toEqual(complexObject);
    });
  });

  describe('并发执行', () => {
    it('应独立处理并发调用', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(async (id: number) => {
        callCount++;
        return `result-${id}`;
      });

      class TestService {
        @Retryable({ maxRetries: 3 })
        @Idempotent()
        async method(id: number) {
          return mockFn(id);
        }
      }

      const service = new TestService();

      const [result1, result2, result3] = await Promise.all([
        service.method(1),
        service.method(2),
        service.method(3),
      ]);

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(result3).toBe('result-3');
      expect(callCount).toBe(3);
    });

    it('并发调用中每个都应独立重试', async () => {
      const attemptsByCall: { [key: number]: number } = {};

      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any) => {
          fn();
          return 0 as any;
        });

      const mockFn = jest.fn().mockImplementation(async (id: number) => {
        attemptsByCall[id] = (attemptsByCall[id] || 0) + 1;
        if (attemptsByCall[id] < 2) {
          throw new Error(`fail-${id}`);
        }
        return `result-${id}`;
      });

      class TestService {
        @Retryable({ maxRetries: 3, initialDelay: 10 })
        @Idempotent()
        async method(id: number) {
          return mockFn(id);
        }
      }

      const service = new TestService();

      const [result1, result2] = await Promise.all([
        service.method(1),
        service.method(2),
      ]);

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(attemptsByCall[1]).toBe(2);
      expect(attemptsByCall[2]).toBe(2);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('元数据检查', () => {
    it('应正确检测 @Idempotent 元数据', () => {
      class TestService {
        @Idempotent()
        async idempotentMethod() {
          return 'test';
        }

        async nonIdempotentMethod() {
          return 'test';
        }
      }

      const service = new TestService();
      const proto = Object.getPrototypeOf(service);

      // 验证 @Idempotent 元数据存在
      const idempotentMeta = Reflect.getMetadata(
        IDEMPOTENT_KEY,
        proto.idempotentMethod,
      );
      expect(idempotentMeta).toBe(true);

      // 验证未标记的方法没有元数据
      const nonIdempotentMeta = Reflect.getMetadata(
        IDEMPOTENT_KEY,
        proto.nonIdempotentMethod,
      );
      expect(nonIdempotentMeta).toBeUndefined();
    });
  });
});
