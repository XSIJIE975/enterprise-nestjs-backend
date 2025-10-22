import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { RequestContextService } from '../request-context/request-context.service';

/**
 * 增强的日志服务
 * 自动从 RequestContext 中获取 requestId 和 userId
 * 提供结构化的日志记录能力
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 获取日志上下文（自动包含 requestId 和 userId）
   */
  private getLogContext(context?: string) {
    const requestId = RequestContextService.getRequestId();
    const userId = RequestContextService.getUserId();

    return {
      context,
      requestId,
      userId,
    };
  }

  log(message: any, context?: string) {
    this.logger.info(message, this.getLogContext(context));
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, {
      ...this.getLogContext(context),
      trace,
    });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, this.getLogContext(context));
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, this.getLogContext(context));
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, this.getLogContext(context));
  }

  fatal(message: any, context?: string) {
    this.logger.error(message, {
      ...this.getLogContext(context),
      level: 'fatal',
    });
  }

  // ==================== 业务日志方法 ====================

  /**
   * 记录 API 调用日志
   */
  logApiCall(data: {
    requestId: string;
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    ip: string;
    userAgent?: string;
    userId?: string;
  }) {
    this.logger.info('API Call', {
      type: 'api_call',
      ...data,
    });
  }

  /**
   * 记录错误日志
   */
  logError(data: {
    requestId?: string;
    error: Error;
    context?: string;
    userId?: string;
  }) {
    const requestId = data.requestId || RequestContextService.getRequestId();
    const userId = data.userId || RequestContextService.getUserId();

    this.logger.error('Application Error', {
      type: 'application_error',
      requestId,
      userId,
      message: data.error.message,
      stack: data.error.stack,
      context: data.context,
    });
  }

  /**
   * 记录业务事件日志
   */
  logBusinessEvent(data: {
    event: string;
    userId?: string;
    data?: any;
    requestId?: string;
  }) {
    const requestId = data.requestId || RequestContextService.getRequestId();
    const userId = data.userId || RequestContextService.getUserId();

    this.logger.info('Business Event', {
      type: 'business_event',
      requestId,
      userId,
      event: data.event,
      data: data.data,
    });
  }

  /**
   * 记录数据库操作日志
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    data?: any,
  ) {
    this.logger.debug(`Database ${operation} on ${table} (${duration}ms)`, {
      type: 'database_operation',
      operation,
      table,
      duration,
      data,
      ...this.getLogContext('Database'),
    });
  }

  /**
   * 记录缓存操作日志
   */
  logCacheOperation(
    operation: 'get' | 'set' | 'del',
    key: string,
    hit?: boolean,
  ) {
    this.logger.debug(
      `Cache ${operation}: ${key}${hit !== undefined ? ` (${hit ? 'HIT' : 'MISS'})` : ''}`,
      {
        type: 'cache_operation',
        operation,
        key,
        hit,
        ...this.getLogContext('Cache'),
      },
    );
  }

  /**
   * 记录安全相关日志
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: any,
  ) {
    const logMethod =
      severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this.logger[logMethod](`Security Event: ${event}`, {
      type: 'security_event',
      event,
      severity,
      details,
      ...this.getLogContext('Security'),
    });
  }
}
