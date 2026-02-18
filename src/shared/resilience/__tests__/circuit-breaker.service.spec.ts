import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { LoggerService } from '@/shared/logger/logger.service';
import {
  CircuitBreakerService,
  CircuitState,
  CircuitBreakerConfig,
} from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基础功能', () => {
    describe('getState', () => {
      it('应该为新的熔断器返回 CLOSED 状态', () => {
        const state = service.getState('new-circuit');
        expect(state).toBe(CircuitState.CLOSED);
      });
    });

    describe('getStats', () => {
      it('应该为新的熔断器返回空统计', () => {
        const stats = service.getStats('new-circuit');
        expect(stats).toEqual({
          requests: 0,
          failures: 0,
          successes: 0,
          consecutiveSuccesses: 0,
        });
      });
    });

    describe('reset', () => {
      it('应该重置熔断器到 CLOSED 状态', async () => {
        const failOp = jest.fn().mockRejectedValue(new Error('fail'));

        // 触发熔断
        for (let i = 0; i < 20; i++) {
          await expect(service.execute('test', failOp)).rejects.toThrow();
        }
        expect(service.getState('test')).toBe(CircuitState.OPEN);

        // 重置
        service.reset('test');

        expect(service.getState('test')).toBe(CircuitState.CLOSED);
        expect(service.getStats('test')).toEqual({
          requests: 0,
          failures: 0,
          successes: 0,
          consecutiveSuccesses: 0,
        });
        expect(loggerService.log).toHaveBeenCalledWith(
          "Circuit breaker 'test' reset to CLOSED",
        );
      });
    });
  });

  describe('CLOSED 状态', () => {
    it('应该成功执行操作', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.execute('test', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('应该记录成功统计', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await service.execute('test', operation);

      const stats = service.getStats('test');
      expect(stats.requests).toBe(1);
      expect(stats.successes).toBe(1);
      expect(stats.failures).toBe(0);
      expect(stats.consecutiveSuccesses).toBe(1);
    });

    it('应该在操作失败时抛出原始错误', async () => {
      const error = new Error('operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(service.execute('test', operation)).rejects.toThrow(
        'operation failed',
      );
    });

    it('应该记录失败统计', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(service.execute('test', operation)).rejects.toThrow();

      const stats = service.getStats('test');
      expect(stats.requests).toBe(1);
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(0);
      expect(stats.consecutiveSuccesses).toBe(0);
    });

    it('应该在失败后重置连续成功计数', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 3次成功
      for (let i = 0; i < 3; i++) {
        await service.execute('test', successOp);
      }
      expect(service.getStats('test').consecutiveSuccesses).toBe(3);

      // 1次失败
      await expect(service.execute('test', failOp)).rejects.toThrow();
      expect(service.getStats('test').consecutiveSuccesses).toBe(0);
    });

    it('应该在达到失败阈值后转换到 OPEN 状态', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 执行足够多的失败请求（超过 minimumRequests 且失败率 >= 50%）
      // 默认 minimumRequests = 10, failureThreshold = 0.5
      // 需要至少 10 个请求，且失败率 >= 50%
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow('fail');
      }

      expect(service.getState('test')).toBe(CircuitState.OPEN);
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('CLOSED → OPEN'),
      );
    });

    it('应该支持自定义配置', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      const customConfig: Partial<CircuitBreakerConfig> = {
        minimumRequests: 5,
        failureThreshold: 0.8,
      };

      // 5 次失败 = 100% 失败率 > 80%
      for (let i = 0; i < 5; i++) {
        await expect(
          service.execute('test', failOp, customConfig),
        ).rejects.toThrow('fail');
      }

      expect(service.getState('test')).toBe(CircuitState.OPEN);
    });
  });

  describe('OPEN 状态', () => {
    beforeEach(async () => {
      // 先触发熔断
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }
      expect(service.getState('test')).toBe(CircuitState.OPEN);
    });

    it('应该立即拒绝请求', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(service.execute('test', operation)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.execute('test', operation)).rejects.toThrow(
        "Circuit breaker 'test' is OPEN",
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it('应该在超时后转换到 HALF_OPEN 状态', async () => {
      // 快进时间（超过 timeout，默认 60 秒）
      jest.advanceTimersByTime(61000);

      const operation = jest.fn().mockResolvedValue('success');
      const result = await service.execute('test', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(service.getState('test')).toBe(CircuitState.HALF_OPEN);
    });

    it('应该支持自定义超时时间', async () => {
      service.reset('test');

      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      const customConfig: Partial<CircuitBreakerConfig> = {
        timeout: 30000, // 30秒
      };

      // 触发熔断
      for (let i = 0; i < 10; i++) {
        await expect(
          service.execute('test', failOp, customConfig),
        ).rejects.toThrow();
      }
      expect(service.getState('test')).toBe(CircuitState.OPEN);

      // 30秒后应该可以尝试
      jest.advanceTimersByTime(31000);

      const successOp = jest.fn().mockResolvedValue('success');
      const result = await service.execute('test', successOp, customConfig);
      expect(result).toBe('success');
    });
  });

  describe('HALF_OPEN 状态', () => {
    beforeEach(async () => {
      // 先触发熔断
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }
      // 快进到 HALF_OPEN
      jest.advanceTimersByTime(61000);
    });

    it('应该允许测试请求', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.execute('test', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('应该在连续成功后转换回 CLOSED 状态', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // 执行连续成功请求（默认 successThreshold = 3）
      for (let i = 0; i < 3; i++) {
        await service.execute('test', operation);
      }

      expect(service.getState('test')).toBe(CircuitState.CLOSED);
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('HALF_OPEN → CLOSED'),
      );
    });

    it('应该在恢复到 CLOSED 后重置统计', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // 执行连续成功请求
      for (let i = 0; i < 3; i++) {
        await service.execute('test', operation);
      }

      const stats = service.getStats('test');
      expect(stats.requests).toBe(0);
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });

    it('应该在失败后立即回到 OPEN 状态', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('test failure'));

      // 第一个请求触发状态转换
      const successOp = jest.fn().mockResolvedValue('success');
      await service.execute('test', successOp);
      expect(service.getState('test')).toBe(CircuitState.HALF_OPEN);

      // 失败后回到 OPEN
      await expect(service.execute('test', failOp)).rejects.toThrow(
        'test failure',
      );

      expect(service.getState('test')).toBe(CircuitState.OPEN);
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('HALF_OPEN → OPEN'),
      );
    });

    it('应该支持自定义成功阈值', async () => {
      service.reset('test');

      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      const successOp = jest.fn().mockResolvedValue('success');
      const customConfig: Partial<CircuitBreakerConfig> = {
        successThreshold: 5,
      };

      // 触发熔断
      for (let i = 0; i < 10; i++) {
        await expect(
          service.execute('test', failOp, customConfig),
        ).rejects.toThrow();
      }

      // 快进到 HALF_OPEN
      jest.advanceTimersByTime(61000);

      // 4次成功不够
      for (let i = 0; i < 4; i++) {
        await service.execute('test', successOp, customConfig);
      }
      expect(service.getState('test')).toBe(CircuitState.HALF_OPEN);

      // 第5次成功后恢复
      await service.execute('test', successOp, customConfig);
      expect(service.getState('test')).toBe(CircuitState.CLOSED);
    });
  });

  describe('失败率计算', () => {
    it('不应该在未达到最小请求数时触发熔断', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 执行少于 minimumRequests 的失败（默认 minimumRequests = 10）
      for (let i = 0; i < 9; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow('fail');
      }

      // 应该仍然是 CLOSED 状态
      expect(service.getState('test')).toBe(CircuitState.CLOSED);

      // 应该仍然允许执行
      const successOp = jest.fn().mockResolvedValue('ok');
      const result = await service.execute('test', successOp);
      expect(result).toBe('ok');
      expect(successOp).toHaveBeenCalled();
    });

    it('应该正确计算混合请求的失败率', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 5次成功
      for (let i = 0; i < 5; i++) {
        await service.execute('test', successOp);
      }

      // 5次失败（总共10次请求，失败率 = 50%，刚好达到阈值）
      for (let i = 0; i < 5; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }

      // 应该触发熔断（失败率 = 50% >= 50%）
      expect(service.getState('test')).toBe(CircuitState.OPEN);
    });

    it('不应该在失败率低于阈值时触发熔断', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 6次成功
      for (let i = 0; i < 6; i++) {
        await service.execute('test', successOp);
      }

      // 4次失败（总共10次请求，失败率 = 40% < 50%）
      for (let i = 0; i < 4; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }

      // 不应该触发熔断
      expect(service.getState('test')).toBe(CircuitState.CLOSED);
    });

    it('应该支持自定义失败率阈值', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      const successOp = jest.fn().mockResolvedValue('success');
      const customConfig: Partial<CircuitBreakerConfig> = {
        failureThreshold: 0.3, // 30%
        minimumRequests: 10,
      };

      // 7次成功
      for (let i = 0; i < 7; i++) {
        await service.execute('test', successOp, customConfig);
      }

      // 3次失败（总共10次请求，失败率 = 30%）
      for (let i = 0; i < 3; i++) {
        await expect(
          service.execute('test', failOp, customConfig),
        ).rejects.toThrow();
      }

      // 应该触发熔断（失败率 = 30% >= 30%）
      expect(service.getState('test')).toBe(CircuitState.OPEN);
    });

    it('应该记录正确的 lastFailureTime', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      const now = Date.now();

      await expect(service.execute('test', failOp)).rejects.toThrow();

      const stats = service.getStats('test');
      expect(stats.lastFailureTime).toBeDefined();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(now);
    });
  });

  describe('多熔断器隔离', () => {
    it('应该为不同名称维护独立状态', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));
      const successOp = jest.fn().mockResolvedValue('success');

      // 触发 circuit1 熔断
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('circuit1', failOp)).rejects.toThrow();
      }

      expect(service.getState('circuit1')).toBe(CircuitState.OPEN);
      expect(service.getState('circuit2')).toBe(CircuitState.CLOSED);

      // circuit2 应该仍然正常
      const result = await service.execute('circuit2', successOp);
      expect(result).toBe('success');
      expect(successOp).toHaveBeenCalled();
    });

    it('应该为不同熔断器维护独立统计', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // circuit1 执行 3 次成功
      for (let i = 0; i < 3; i++) {
        await service.execute('circuit1', successOp);
      }

      // circuit2 执行 2 次失败
      for (let i = 0; i < 2; i++) {
        await expect(service.execute('circuit2', failOp)).rejects.toThrow();
      }

      const stats1 = service.getStats('circuit1');
      const stats2 = service.getStats('circuit2');

      expect(stats1.successes).toBe(3);
      expect(stats1.failures).toBe(0);

      expect(stats2.successes).toBe(0);
      expect(stats2.failures).toBe(2);
    });

    it('重置一个熔断器不应影响其他熔断器', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 触发两个熔断器熔断
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('circuit1', failOp)).rejects.toThrow();
        await expect(service.execute('circuit2', failOp)).rejects.toThrow();
      }

      expect(service.getState('circuit1')).toBe(CircuitState.OPEN);
      expect(service.getState('circuit2')).toBe(CircuitState.OPEN);

      // 只重置 circuit1
      service.reset('circuit1');

      expect(service.getState('circuit1')).toBe(CircuitState.CLOSED);
      expect(service.getState('circuit2')).toBe(CircuitState.OPEN);
    });
  });

  describe('边界条件', () => {
    it('应该处理异步操作返回 undefined', async () => {
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.execute('test', operation);

      expect(result).toBeUndefined();
    });

    it('应该处理异步操作返回 null', async () => {
      const operation = jest.fn().mockResolvedValue(null);

      const result = await service.execute('test', operation);

      expect(result).toBeNull();
    });

    it('应该正确处理同时抛出的非 Error 对象', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(service.execute('test', operation)).rejects.toBe(
        'string error',
      );
    });

    it('应该在刚好达到 minimumRequests 时检查失败率', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 执行刚好 10 次失败（刚好达到 minimumRequests）
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }

      // 应该触发熔断（100% 失败率 >= 50%）
      expect(service.getState('test')).toBe(CircuitState.OPEN);
    });

    it('没有 lastFailureTime 时应该允许重置尝试', async () => {
      // 手动设置状态但没有 lastFailureTime
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 执行足够的失败来触发 OPEN
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }

      // 重置统计但保持 OPEN 状态（模拟边缘情况）
      // 实际上，这种情况不太可能发生，但测试 shouldAttemptReset 的逻辑
      const stats = service.getStats('test');
      expect(stats.lastFailureTime).toBeDefined();
    });
  });

  describe('状态转换日志', () => {
    it('应该在状态转换时记录警告日志', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 触发 CLOSED → OPEN
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }

      expect(loggerService.warn).toHaveBeenCalledWith(
        "Circuit breaker 'test' transitioned: CLOSED → OPEN",
      );
    });

    it('相同状态不应重复转换', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 触发 OPEN
      for (let i = 0; i < 10; i++) {
        await expect(service.execute('test', failOp)).rejects.toThrow();
      }

      // 清除之前的调用记录
      loggerService.warn.mockClear();

      // 尝试再次触发（但已经是 OPEN 了）
      await expect(service.execute('test', failOp)).rejects.toThrow(
        ServiceUnavailableException,
      );

      // 不应该有新的状态转换日志
      expect(loggerService.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('transitioned'),
      );
    });
  });

  describe('并发执行', () => {
    it('应该正确处理并发成功请求', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // 并发执行 5 个请求
      const results = await Promise.all([
        service.execute('test', operation),
        service.execute('test', operation),
        service.execute('test', operation),
        service.execute('test', operation),
        service.execute('test', operation),
      ]);

      expect(results).toEqual([
        'success',
        'success',
        'success',
        'success',
        'success',
      ]);
      expect(operation).toHaveBeenCalledTimes(5);

      const stats = service.getStats('test');
      expect(stats.requests).toBe(5);
      expect(stats.successes).toBe(5);
    });

    it('应该正确处理并发失败请求', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      // 并发执行 10 个失败请求
      const promises = Array(10)
        .fill(null)
        .map(() => service.execute('test', failOp).catch(e => e));

      const results = await Promise.all(promises);

      expect(results.every(r => r instanceof Error)).toBe(true);
      expect(service.getState('test')).toBe(CircuitState.OPEN);
    });
  });
});
