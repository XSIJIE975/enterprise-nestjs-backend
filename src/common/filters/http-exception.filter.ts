import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorMessages } from '../enums/error-codes.enum';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
      
      if (typeof errorResponse === 'object' && errorResponse && 'message' in errorResponse) {
        const responseMessage = (errorResponse as any).message;
        message = Array.isArray(responseMessage) 
          ? responseMessage.join(', ')
          : responseMessage;
      } else {
        message = errorResponse?.toString() || 'HTTP Exception';
      }
      
      // 根据HTTP状态码映射到错误码
      errorCode = this.mapHttpStatusToErrorCode(statusCode);
    } else {
      errorCode = ErrorCode.SYSTEM_ERROR;
      message = '系统内部错误';
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    const errorResult = {
      code: errorCode,
      message,
      data,
      requestId: request['requestId'] || 'unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // 记录错误日志
    this.logger.error(
      `${errorCode}: ${message}`,
      {
        requestId: request['requestId'],
        path: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        stack: exception instanceof Error ? exception.stack : undefined,
        userId: (request as any)['user']?.userId || (request as any)['user']?.id,
      },
    );

    response.status(statusCode).json(errorResult);
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
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.SYSTEM_ERROR;
      default:
        return ErrorCode.SYSTEM_ERROR;
    }
  }
}
