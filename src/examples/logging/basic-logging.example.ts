import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/shared/logger/logger.service';
import { LogsService } from '@/modules/logs/logs.service';
import { RequestContextService } from '@/shared/request-context/request-context.service';

/**
 * 日志系统基础使用示例
 *
 * 展示最常用的日志记录方法
 */
@Injectable()
export class BasicLoggingExample {
  constructor(
    private readonly logger: LoggerService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 示例 1: 基本日志级别
   */
  basicLevels() {
    // 自动包含 requestId 和 userId
    this.logger.log('User logged in successfully', 'AuthService');
    this.logger.debug('Validating user credentials', 'AuthService');
    this.logger.warn('Password will expire in 7 days', 'AuthService');
    this.logger.error(
      'Database connection failed',
      'stack trace',
      'AuthService',
    );
  }

  /**
   * 示例 2: 获取请求上下文
   */
  getRequestContext() {
    const requestId = RequestContextService.getRequestId();
    const userId = RequestContextService.getUserId();
    const ip = RequestContextService.getIp();

    this.logger.log(
      `Processing request - ID: ${requestId}, User: ${userId}, IP: ${ip}`,
      'OrderService',
    );
  }

  /**
   * 示例 3: 业务事件日志
   */
  logBusinessEvent() {
    this.logger.logBusinessEvent({
      event: 'ORDER_CREATED',
      data: {
        orderId: '12345',
        amount: 99.99,
        userId: RequestContextService.getUserId(),
      },
    });
  }

  /**
   * 示例 4: 错误处理日志
   */
  async processOrder() {
    try {
      // 业务逻辑
      throw new Error('Payment gateway timeout');
    } catch (error: any) {
      this.logger.logError({
        error,
        context: 'OrderService.processOrder',
      });
      throw error;
    }
  }

  /**
   * 示例 5: 审计日志（重要操作）
   */
  async updateUserRole(userId: number, oldRole: string, newRole: string) {
    await this.logsService.createAuditLog({
      userId: RequestContextService.getUserId(),
      action: 'UPDATE',
      resource: 'user_role',
      resourceId: userId.toString(),
      oldData: { role: oldRole },
      newData: { role: newRole },
      ip: RequestContextService.getIp(),
    });

    this.logger.log(
      `User role updated: ${oldRole} -> ${newRole}`,
      'UserService',
    );
  }
}
