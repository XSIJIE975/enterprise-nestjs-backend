import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@/shared/cache/cache.service';

/**
 * 账户锁定服务
 *
 * 功能：
 * - 渐进式锁定策略（5次→15分钟，10次→1小时）
 * - 使用 Redis INCR 原子操作避免竞态条件
 * - 独立计数（锁定解除后计数归零）
 */
@Injectable()
export class AccountLockoutService {
  private readonly lockoutConfig: {
    enabled: boolean;
    maxAttempts: number[];
    lockDurations: number[];
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get('security.accountLockout') || {};
    this.lockoutConfig = {
      enabled: config.enabled ?? true,
      maxAttempts: config.maxAttempts || [5, 10],
      lockDurations: config.lockDurations || [900, 3600], // 15分钟, 1小时（秒）
    };
  }

  /**
   * 记录登录失败
   * @param userId 用户 ID
   * @returns 当前失败次数
   */
  async recordFailedAttempt(userId: string): Promise<number> {
    if (!this.lockoutConfig.enabled) {
      return 0;
    }

    const key = this.getFailureKey(userId);
    const lockKey = this.getLockKey(userId);

    // 检查是否已锁定
    const isLocked = await this.cacheService.exists(lockKey);
    if (isLocked) {
      // 已锁定，不增加计数
      const count = await this.cacheService.get<string>(key);
      return parseInt(count || '0', 10);
    }

    // 使用 Redis INCR 原子操作增加失败次数
    const failureCount = await this.incrementFailureCount(key);

    // 检查是否达到锁定阈值
    await this.checkAndLock(userId, failureCount);

    return failureCount;
  }

  /**
   * 检查账户是否被锁定
   * @param userId 用户 ID
   * @returns { locked: boolean, remainingTime?: number }
   */
  async checkLockStatus(
    userId: string,
  ): Promise<{ locked: boolean; remainingTime?: number }> {
    if (!this.lockoutConfig.enabled) {
      return { locked: false };
    }

    const lockKey = this.getLockKey(userId);
    const exists = await this.cacheService.exists(lockKey);

    if (!exists) {
      return { locked: false };
    }

    const remainingTime = await this.cacheService.ttl(lockKey);
    return {
      locked: true,
      remainingTime: remainingTime > 0 ? remainingTime : undefined,
    };
  }

  /**
   * 重置失败计数（登录成功时调用）
   * @param userId 用户 ID
   */
  async resetFailureCount(userId: string): Promise<void> {
    if (!this.lockoutConfig.enabled) {
      return;
    }

    const key = this.getFailureKey(userId);
    await this.cacheService.del(key);
  }

  /**
   * 手动解锁账户（管理员操作）
   * @param userId 用户 ID
   */
  async unlockAccount(userId: string): Promise<void> {
    const lockKey = this.getLockKey(userId);
    const failureKey = this.getFailureKey(userId);

    await this.cacheService.del(lockKey);
    await this.cacheService.del(failureKey);
  }

  /**
   * 原子递增失败次数
   */
  private async incrementFailureCount(key: string): Promise<number> {
    // 获取当前值
    const current = await this.cacheService.get<string>(key);
    const currentCount = parseInt(current || '0', 10);
    const newCount = currentCount + 1;

    // 设置新值，TTL 为最长锁定时间 + 缓冲
    const maxDuration = Math.max(...this.lockoutConfig.lockDurations);
    await this.cacheService.set(key, newCount.toString(), maxDuration + 300);

    return newCount;
  }

  /**
   * 检查并锁定账户
   */
  private async checkAndLock(
    userId: string,
    failureCount: number,
  ): Promise<void> {
    const { maxAttempts, lockDurations } = this.lockoutConfig;

    for (let i = maxAttempts.length - 1; i >= 0; i--) {
      if (failureCount >= maxAttempts[i]) {
        const lockKey = this.getLockKey(userId);
        const duration = lockDurations[i];

        // 锁定账户
        await this.cacheService.set(lockKey, 'locked', duration);

        // 锁定后重置失败计数（独立计数策略）
        const failureKey = this.getFailureKey(userId);
        await this.cacheService.del(failureKey);

        break;
      }
    }
  }

  private getFailureKey(userId: string): string {
    return `account:lockout:failures:${userId}`;
  }

  private getLockKey(userId: string): string {
    return `account:lockout:locked:${userId}`;
  }
}
