import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LoggerService } from '@/shared/logger/logger.service';

/**
 * 熔断器状态
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // 正常状态
  OPEN = 'OPEN', // 熔断状态
  HALF_OPEN = 'HALF_OPEN', // 半开状态（测试恢复）
}

/**
 * 熔断器配置
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // 失败率阈值（0-1）
  successThreshold: number; // 半开状态成功次数阈值
  timeout: number; // 熔断器打开后的超时时间（毫秒）
  minimumRequests: number; // 最小请求数（低于此数不触发熔断）
}

/**
 * 熔断器统计
 */
interface CircuitStats {
  requests: number;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  consecutiveSuccesses: number;
}

/**
 * 熔断器服务
 *
 * 实现三态模型：
 * - CLOSED: 正常执行，统计失败率
 * - OPEN: 熔断打开，直接拒绝请求
 * - HALF_OPEN: 允许少量请求测试恢复
 */
@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, CircuitState>();
  private stats = new Map<string, CircuitStats>();
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 0.5, // 50%失败率
    successThreshold: 3, // 半开状态3次成功后恢复
    timeout: 60000, // 60秒后尝试半开
    minimumRequests: 10, // 至少10个请求才触发熔断
  };

  constructor(private readonly logger: LoggerService) {}

  /**
   * 执行受保护的操作
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const state = this.getState(circuitName);

    // 检查熔断器状态
    if (state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuitName, finalConfig)) {
        this.transitionTo(circuitName, CircuitState.HALF_OPEN);
      } else {
        throw new ServiceUnavailableException(
          `Circuit breaker '${circuitName}' is OPEN`,
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess(circuitName, finalConfig);
      return result;
    } catch (error) {
      this.onFailure(circuitName, finalConfig);
      throw error;
    }
  }

  /**
   * 获取熔断器状态
   */
  getState(circuitName: string): CircuitState {
    return this.circuits.get(circuitName) || CircuitState.CLOSED;
  }

  /**
   * 获取熔断器统计
   */
  getStats(circuitName: string): CircuitStats {
    return (
      this.stats.get(circuitName) || {
        requests: 0,
        failures: 0,
        successes: 0,
        consecutiveSuccesses: 0,
      }
    );
  }

  /**
   * 重置熔断器
   */
  reset(circuitName: string): void {
    this.circuits.set(circuitName, CircuitState.CLOSED);
    this.stats.set(circuitName, {
      requests: 0,
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
    });
    this.logger.log(`Circuit breaker '${circuitName}' reset to CLOSED`);
  }

  /**
   * 记录成功
   */
  private onSuccess(circuitName: string, config: CircuitBreakerConfig): void {
    const stats = this.getStats(circuitName);
    stats.requests++;
    stats.successes++;
    stats.consecutiveSuccesses++;
    this.stats.set(circuitName, stats);

    const state = this.getState(circuitName);

    // 半开状态下，达到成功阈值后恢复到关闭状态
    if (state === CircuitState.HALF_OPEN) {
      if (stats.consecutiveSuccesses >= config.successThreshold) {
        this.transitionTo(circuitName, CircuitState.CLOSED);
        this.resetStats(circuitName);
      }
    }
  }

  /**
   * 记录失败
   */
  private onFailure(circuitName: string, config: CircuitBreakerConfig): void {
    const stats = this.getStats(circuitName);
    stats.requests++;
    stats.failures++;
    stats.lastFailureTime = Date.now();
    stats.consecutiveSuccesses = 0;
    this.stats.set(circuitName, stats);

    const state = this.getState(circuitName);

    // 半开状态下失败，立即回到打开状态
    if (state === CircuitState.HALF_OPEN) {
      this.transitionTo(circuitName, CircuitState.OPEN);
      return;
    }

    // 关闭状态下，检查是否应该打开熔断器
    if (state === CircuitState.CLOSED) {
      if (stats.requests >= config.minimumRequests) {
        const failureRate = stats.failures / stats.requests;
        if (failureRate >= config.failureThreshold) {
          this.transitionTo(circuitName, CircuitState.OPEN);
        }
      }
    }
  }

  /**
   * 检查是否应该尝试重置（从 OPEN 到 HALF_OPEN）
   */
  private shouldAttemptReset(
    circuitName: string,
    config: CircuitBreakerConfig,
  ): boolean {
    const stats = this.getStats(circuitName);
    if (!stats.lastFailureTime) return true;

    const elapsed = Date.now() - stats.lastFailureTime;
    return elapsed >= config.timeout;
  }

  /**
   * 状态转换
   */
  private transitionTo(circuitName: string, newState: CircuitState): void {
    const oldState = this.getState(circuitName);
    if (oldState === newState) return;

    this.circuits.set(circuitName, newState);
    this.logger.warn(
      `Circuit breaker '${circuitName}' transitioned: ${oldState} → ${newState}`,
    );

    // 转换到关闭状态时重置统计
    if (newState === CircuitState.CLOSED) {
      this.resetStats(circuitName);
    }
  }

  /**
   * 重置统计
   */
  private resetStats(circuitName: string): void {
    this.stats.set(circuitName, {
      requests: 0,
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
    });
  }
}
