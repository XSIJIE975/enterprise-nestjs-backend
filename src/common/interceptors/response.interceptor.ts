import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  convertToTimezone,
  convertDatesInObject,
  isValidTimezone,
} from '../utils/timezone.util';

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
  requestId: string;
  timestamp: string;
  timezone?: string; // 当前响应使用的时区
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly configService: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 优先从响应头获取 requestId
    const requestId =
      (response.getHeader('X-Request-Id') as string) ||
      request.requestId ||
      'unknown';

    // 获取时区配置
    // 优先级：请求头 > 环境变量
    const requestTimezone = request.headers['x-timezone'] as string;
    const defaultTimezone =
      this.configService.get<string>('app.appTimezone') || 'Asia/Shanghai';

    let targetTimezone = defaultTimezone;

    // 如果客户端指定了时区且有效，则使用客户端指定的时区
    if (requestTimezone && isValidTimezone(requestTimezone)) {
      targetTimezone = requestTimezone;
    }

    return next.handle().pipe(
      map(data => {
        // 转换响应数据中的所有日期字段
        const convertedData = convertDatesInObject(data, targetTimezone);

        // 转换 timestamp
        const timestamp = convertToTimezone(new Date(), targetTimezone);

        return {
          code: '200',
          message: 'success',
          data: convertedData,
          requestId,
          timestamp,
          timezone: targetTimezone, // 告诉客户端使用的是哪个时区
        };
      }),
    );
  }
}
