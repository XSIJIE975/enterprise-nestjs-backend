import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LogsService } from '../../modules/logs/logs.service';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { DATABASE_LOG_KEY } from '../decorators/database-log.decorator';

/**
 * API 日志记录拦截器
 *
 * 日志记录策略：
 * 1. 文件日志：始终启用（LoggerMiddleware 处理）
 * 2. 数据库日志：支持三种控制方式（按优先级）
 *    - @DisableDatabaseLog() 装饰器：强制禁用
 *    - @EnableDatabaseLog() 装饰器：强制启用
 *    - LOG_ENABLE_DATABASE 环境变量：全局开关（默认 false）
 *
 * 使用建议：
 * - 开发环境：可开启全局数据库日志，便于调试
 * - 生产环境：建议关闭全局开关，只对关键接口使用 @EnableDatabaseLog()
 * - 健康检查、静态资源等高频接口：使用 @DisableDatabaseLog() 排除
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly enableDatabaseLog: boolean;

  constructor(
    private readonly logsService: LogsService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // 读取全局数据库日志开关（默认关闭）
    this.enableDatabaseLog =
      this.configService.get<string>('LOG_ENABLE_DATABASE', 'false') === 'true';

    this.logger.log(
      `Database logging is ${this.enableDatabaseLog ? 'ENABLED' : 'DISABLED'} globally`,
      'LoggingInterceptor',
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 判断是否需要记录数据库日志
    const shouldLogToDatabase = this.shouldLogToDatabase(context);

    const { method, originalUrl, body, query, params, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const requestId = RequestContextService.getRequestId();
    const userId = RequestContextService.getUserId();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(responseData => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // 根据配置决定是否记录到数据库
        if (shouldLogToDatabase) {
          // 异步记录到数据库，不阻塞响应
          this.logsService
            .createApiLog({
              requestId,
              userId,
              method,
              url: originalUrl,
              params: { query, params },
              body: this.sanitizeBody(body),
              response: this.sanitizeResponse(responseData),
              statusCode,
              duration,
              ip,
              userAgent,
            })
            .catch(error => {
              // 记录日志失败不应该影响业务流程
              this.logger.error(
                `Failed to save API log: ${error.message}`,
                error.stack,
                'LoggingInterceptor',
              );
            });
        }
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // 错误日志始终记录到数据库（重要性高）
        if (shouldLogToDatabase) {
          // 记录错误日志到 API 日志表
          this.logsService
            .createApiLog({
              requestId,
              userId,
              method,
              url: originalUrl,
              params: { query, params },
              body: this.sanitizeBody(body),
              response: null,
              statusCode,
              duration,
              ip,
              userAgent,
              error: error.message,
            })
            .catch(logError => {
              this.logger.error(
                `Failed to save error log: ${logError.message}`,
                logError.stack,
                'LoggingInterceptor',
              );
            });

          // 同时记录到错误日志表
          this.logsService
            .createErrorLog({
              requestId,
              userId,
              errorCode: error.code || 'INTERNAL_ERROR',
              message: error.message,
              stack: error.stack,
              context: { method, url: originalUrl },
              ip,
              userAgent,
            })
            .catch(logError => {
              this.logger.error(
                `Failed to save error log: ${logError.message}`,
                logError.stack,
                'LoggingInterceptor',
              );
            });
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * 判断是否需要记录数据库日志
   * 优先级：方法装饰器 > 类装饰器 > 全局配置
   */
  private shouldLogToDatabase(context: ExecutionContext): boolean {
    // 1. 检查方法级别的装饰器
    const methodMetadata = this.reflector.get<boolean>(
      DATABASE_LOG_KEY,
      context.getHandler(),
    );
    if (methodMetadata !== undefined) {
      return methodMetadata;
    }

    // 2. 检查类级别的装饰器
    const classMetadata = this.reflector.get<boolean>(
      DATABASE_LOG_KEY,
      context.getClass(),
    );
    if (classMetadata !== undefined) {
      return classMetadata;
    }

    // 3. 使用全局配置
    return this.enableDatabaseLog;
  }

  /**
   * 清理敏感的请求体数据
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * 清理敏感的响应数据
   */
  private sanitizeResponse(response: any): any {
    if (!response || typeof response !== 'object') {
      return response;
    }

    // 如果响应太大，只保留部分数据
    const maxSize = 10000; // 10KB
    const responseStr = JSON.stringify(response);

    if (responseStr.length > maxSize) {
      return {
        _truncated: true,
        _size: responseStr.length,
        _preview: responseStr.substring(0, maxSize),
      };
    }

    return response;
  }
}
