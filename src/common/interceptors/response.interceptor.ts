import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      map(data => ({
        code: '200',
        message: 'success',
        data,
        requestId: request.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
