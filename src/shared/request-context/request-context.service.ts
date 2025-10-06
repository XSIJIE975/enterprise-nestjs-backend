import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
  startTime?: number;
  method?: string;
  url?: string;
  [key: string]: any;
}

/**
 * 请求上下文服务
 * 使用 AsyncLocalStorage 在整个请求链路中保持上下文信息
 * 这样在任何地方都可以获取到当前请求的 requestId 等信息
 */
@Injectable()
export class RequestContextService {
  private static asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  /**
   * 运行带有上下文的函数
   */
  static run<T>(context: RequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * 获取当前请求上下文
   */
  static getContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * 获取当前请求ID
   */
  static getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  /**
   * 获取当前用户ID
   */
  static getUserId(): number | undefined {
    return this.getContext()?.userId;
  }

  /**
   * 获取客户端IP
   */
  static getIp(): string | undefined {
    return this.getContext()?.ip;
  }

  /**
   * 设置用户ID到当前上下文
   */
  static setUserId(userId: number): void {
    const context = this.getContext();
    if (context) {
      context.userId = userId;
    }
  }

  /**
   * 设置自定义属性到当前上下文
   */
  static set(key: string, value: any): void {
    const context = this.getContext();
    if (context) {
      context[key] = value;
    }
  }

  /**
   * 从当前上下文获取自定义属性
   */
  static get<T = any>(key: string): T | undefined {
    return this.getContext()?.[key];
  }
}
