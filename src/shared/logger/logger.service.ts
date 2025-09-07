import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { Logger } from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  fatal(message: any, context?: string) {
    this.logger.error(message, { context, level: 'fatal' });
  }

  // 业务日志方法
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

  logError(data: {
    requestId: string;
    error: Error;
    context?: string;
    userId?: string;
  }) {
    this.logger.error('Application Error', {
      type: 'application_error',
      message: data.error.message,
      stack: data.error.stack,
      ...data,
    });
  }

  logBusinessEvent(data: {
    event: string;
    userId?: string;
    data?: any;
    requestId?: string;
  }) {
    this.logger.info('Business Event', {
      type: 'business_event',
      ...data,
    });
  }
}
