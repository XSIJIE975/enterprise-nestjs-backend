import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

/**
 * 请求上下文模块
 * 全局模块，用于在整个应用中共享请求上下文
 */
@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule {}
