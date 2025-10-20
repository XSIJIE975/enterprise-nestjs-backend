import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';

/**
 * 自定义限流守卫
 * - 支持从反向代理获取真实IP
 * - 优先级：X-Real-IP > X-Forwarded-For > remoteAddress
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * 获取请求的唯一标识（通常是IP地址）
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 1. 优先从 X-Real-IP 获取（Nginx常用）
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }

    // 2. 从 X-Forwarded-For 获取（可能包含多个IP）
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string') {
      // 取第一个IP（客户端真实IP）
      return forwardedFor.split(',')[0].trim();
    }

    // 3. 从 socket 获取（直连场景）
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * 生成限流 key
   * 格式: throttle:{context}:{tracker}
   */
  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    const request = context.switchToHttp().getRequest();
    const prefix = `throttle:${throttlerName}`;

    // 可以根据路由或用户ID生成更细粒度的key
    // 例如：throttle:short:192.168.1.1:/api/v1/auth/login
    return `${prefix}:${tracker}:${request.url}`;
  }
}
