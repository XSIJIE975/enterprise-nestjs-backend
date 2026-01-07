import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ErrorCode, ErrorMessages } from '../enums/error-codes.enum';
import { BusinessException } from '../exceptions/business.exception';
import { ApiErrorResponse } from '@/common/vo';
import { LogsService } from '@/modules/logs/logs.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { RequestContextService } from '@/shared/request-context/request-context.service';
import { isValidTimezone } from '../utils/timezone.util';

/**
 * 全局异常过滤器
 *
 * 功能：
 * 1. 捕获所有未处理的异常
 * 2. 统一异常响应格式
 * 3. 记录文件日志（始终启用）
 * 4. 记录数据库日志（根据配置决定）
 *
 * 日志策略：
 * - 文件日志：所有异常都记录
 * - 数据库日志：根据 app.log.enableDatabase 配置决定（默认关闭）
 * - 异常日志优先级高，建议生产环境也启用数据库记录
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly enableDatabaseLog: boolean;

  constructor(
    private readonly logger: LoggerService,
    private readonly logsService: LogsService,
    private readonly configService: ConfigService,
  ) {
    // 读取全局数据库日志开关
    this.enableDatabaseLog = this.configService.get<boolean>(
      'app.log.enableDatabase',
      false,
    );
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      RequestContextService.getRequestId() || request['requestId'] || 'unknown';
    const userId =
      RequestContextService.getUserId() ||
      (request as any)['user']?.userId ||
      (request as any)['user']?.id;
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || '';

    // 获取时区配置
    const requestTimezone = request.headers['x-timezone'] as string;
    let targetTimezone =
      this.configService.get<string>('app.appTimezone') || 'Asia/Shanghai';
    if (requestTimezone && isValidTimezone(requestTimezone)) {
      targetTimezone = requestTimezone;
    }

    let errorCode: ErrorCode;
    let message: string;
    let statusCode: number;
    let data: any = null;

    if (exception instanceof BusinessException) {
      const errorResponse = exception.getResponse() as any;
      errorCode = errorResponse.code;
      message = errorResponse.message;
      statusCode = exception.getStatus();
      data = errorResponse.data;
    } else if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      statusCode = exception.getStatus();

      if (
        typeof errorResponse === 'object' &&
        errorResponse &&
        'message' in errorResponse
      ) {
        const responseMessage = (errorResponse as any).message;
        message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage;
      } else {
        message = errorResponse?.toString() || 'HTTP Exception';
      }

      // 优先使用 errorResponse 中的 code，如果没有则根据HTTP状态码映射
      if (
        typeof errorResponse === 'object' &&
        errorResponse &&
        'code' in errorResponse
      ) {
        errorCode = (errorResponse as any).code;
      } else {
        errorCode = this.mapHttpStatusToErrorCode(statusCode);
      }

      // 根据错误码获取对应的消息，如果没有自定义消息则使用默认消息
      message = ErrorMessages[errorCode] || message;
      // 如果是参数验证类的错误（400），把详细验证信息加入 data 字段，便于前端展示
      if (statusCode === HttpStatus.BAD_REQUEST) {
        try {
          const resp = errorResponse as any;
          if (resp && typeof resp === 'object') {
            if (Array.isArray(resp.message)) {
              data = { validationErrors: resp.message };
            } else if (resp['error'] || resp['message']) {
              data = { validationErrors: resp.message || resp.error };
            } else {
              data = resp;
            }
          }
        } catch {
          // 忽略解析错误，不影响主流程
        }
      }
    } else {
      errorCode = ErrorCode.SYSTEM_ERROR;
      message = '系统内部错误';
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    const errorResult: ApiErrorResponse = {
      code: errorCode,
      message,
      data,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      timezone: targetTimezone,
    };

    // 记录文件日志
    this.logger.error(
      `${errorCode}: ${message} | Path: ${request.url} | Method: ${request.method}`,
      exception instanceof Error ? exception.stack : undefined,
      'AllExceptionsFilter',
    );

    // 根据配置决定是否记录数据库日志
    if (this.enableDatabaseLog) {
      // 异步记录到数据库，不阻塞响应
      this.logsService
        .createErrorLog({
          requestId,
          userId,
          errorCode,
          message,
          stack: exception instanceof Error ? exception.stack : undefined,
          context: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
            body: this.sanitizeBody(request.body),
            statusCode,
          },
          ip,
          userAgent,
        })
        .catch(error => {
          // 记录日志失败不应该影响业务流程
          this.logger.error(
            `Failed to save error log to database: ${error.message}`,
            error.stack,
            'AllExceptionsFilter',
          );
        });
    }

    response.status(statusCode).json(errorResult);
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

  private mapHttpStatusToErrorCode(statusCode: number): ErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.TOKEN_INVALID;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.DATABASE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.DATABASE_DUPLICATE;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.SYSTEM_ERROR;
      default:
        return ErrorCode.SYSTEM_ERROR;
    }
  }
}
