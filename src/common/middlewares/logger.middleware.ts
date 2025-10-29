import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../shared/logger/logger.service';
import { RequestContextService } from '../../shared/request-context/request-context.service';

/**
 * 日志中间件
 * 为每个请求生成 requestId，并使用 AsyncLocalStorage 在整个请求链路中保持上下文
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const requestId = (headers['x-request-id'] as string) || uuidv4();
    const startTime = Date.now();

    // 将 requestId 添加到响应头中，方便客户端追踪
    res.setHeader('X-Request-Id', requestId);

    req['requestId'] = requestId;

    // 使用 AsyncLocalStorage 存储请求上下文
    const context = {
      requestId,
      ip,
      userAgent,
      method,
      url: originalUrl,
      startTime,
    };

    // 在上下文中运行后续的处理逻辑
    RequestContextService.run(context, () => {
      // 记录请求开始
      this.logger.debug(`→ ${method} ${originalUrl}`, 'HTTP');

      // 监听响应完成事件
      res.on('finish', () => {
        const { statusCode } = res;
        const duration = Date.now() - startTime;

        // 使用 LoggerService 记录结构化日志
        const logData = {
          requestId,
          method,
          url: originalUrl,
          statusCode,
          duration,
          ip,
          userAgent,
          userId: RequestContextService.getUserId(),
        };

        // 根据状态码选择日志级别
        if (statusCode >= 500) {
          this.logger.error(
            `← ${method} ${originalUrl} ${statusCode} ${duration}ms`,
            'HTTP',
          );
        } else if (statusCode >= 400) {
          this.logger.warn(
            `← ${method} ${originalUrl} ${statusCode} ${duration}ms`,
            'HTTP',
          );
        } else {
          this.logger.log(
            `← ${method} ${originalUrl} ${statusCode} ${duration}ms`,
            'HTTP',
          );
        }

        // 记录详细的 API 调用日志（用于审计和分析）
        this.logger.logApiCall(logData);
      });

      // 监听错误事件
      res.on('error', error => {
        this.logger.error(
          `✗ ${method} ${originalUrl} - ${error.message}`,
          error.stack,
          'HTTP',
        );
      });

      next();
    });
  }
}
