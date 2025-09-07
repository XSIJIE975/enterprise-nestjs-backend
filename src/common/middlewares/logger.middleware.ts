import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const requestId = uuidv4();
    
    // 将requestId添加到请求对象中
    req['requestId'] = requestId;
    
    const start = Date.now();
    
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      
      console.log(JSON.stringify({
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      }));
    });
    
    next();
  }
}
