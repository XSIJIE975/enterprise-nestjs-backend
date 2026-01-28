import { Logger } from '@nestjs/common';
import 'reflect-metadata';
import { IDEMPOTENT_KEY } from './idempotent.decorator';

/**
 * 重试装饰器配置
 */
export interface RetryableOptions {
  /**
   * 最大重试次数
   * @default 3
   */
  maxRetries?: number;

  /**
   * 初始延迟时间（毫秒）
   * @default 100
   */
  initialDelay?: number;

  /**
   * 指数退避倍数
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * 总超时时间（毫秒）
   * @default 10000 (10s)
   */
  timeout?: number;

  /**
   * 可重试的错误类型（默认所有错误都重试）
   */
  retryableErrors?: Array<new (...args: any[]) => Error>;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<RetryableOptions> = {
  maxRetries: 3,
  initialDelay: 100,
  backoffMultiplier: 2,
  timeout: 10000,
  retryableErrors: [],
};

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查错误是否可重试
 */
function isRetryableError(
  error: Error,
  retryableErrors: Array<new (...args: any[]) => Error>,
): boolean {
  if (retryableErrors.length === 0) {
    return true; // 默认所有错误都重试
  }
  return retryableErrors.some(ErrorClass => error instanceof ErrorClass);
}

/**
 * 重试装饰器
 * 只应用于标记了 @Idempotent() 的方法
 *
 * @param options - 重试配置选项
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   @Idempotent()
 *   @Retryable({ maxRetries: 3, initialDelay: 100 })
 *   async findById(id: string) {
 *     return this.prisma.user.findUnique({ where: { id } });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CacheService {
 *   @Idempotent()
 *   @Retryable({ timeout: 5000, retryableErrors: [RedisConnectionError] })
 *   async get(key: string) {
 *     return this.redis.get(key);
 *   }
 * }
 * ```
 */
export function Retryable(options: RetryableOptions = {}): MethodDecorator {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    // 检查是否标记为幂等
    const isIdempotent = Reflect.getMetadata(IDEMPOTENT_KEY, descriptor.value);
    if (!isIdempotent) {
      throw new Error(
        `Method ${String(propertyKey)} must be marked with @Idempotent() to use @Retryable()`,
      );
    }

    const originalMethod = descriptor.value;
    const logger = new Logger(
      `${target.constructor.name}.${String(propertyKey)}`,
    );

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let lastError: Error;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          // 检查是否超过总超时
          const elapsed = Date.now() - startTime;
          if (elapsed >= config.timeout) {
            logger.warn(
              `Total timeout (${config.timeout}ms) exceeded after ${attempt} attempts`,
            );
            throw new Error(
              `Operation timeout after ${elapsed}ms (max: ${config.timeout}ms)`,
            );
          }

          // 执行原方法
          const result = await originalMethod.apply(this, args);
          if (attempt > 0) {
            logger.log(
              `Succeeded on attempt ${attempt + 1}/${config.maxRetries + 1}`,
            );
          }
          return result;
        } catch (error) {
          lastError = error as Error;

          // 检查是否可重试
          if (!isRetryableError(lastError, config.retryableErrors)) {
            logger.warn(
              `Error is not retryable: ${lastError.constructor.name}`,
            );
            throw lastError;
          }

          // 最后一次尝试失败
          if (attempt === config.maxRetries) {
            logger.error(
              `All retry attempts (${config.maxRetries}) failed: ${lastError.message}`,
            );
            throw lastError;
          }

          // 计算指数退避延迟
          const delay =
            config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
          const remainingTime = config.timeout - (Date.now() - startTime);

          // 如果剩余时间不足以等待，直接失败
          if (delay >= remainingTime) {
            logger.warn(
              `Not enough time for retry (need ${delay}ms, have ${remainingTime}ms)`,
            );
            throw lastError;
          }

          logger.warn(
            `Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms: ${lastError.message}`,
          );
          await sleep(delay);
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}
