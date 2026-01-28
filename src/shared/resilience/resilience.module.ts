import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * 弹性机制模块
 * 提供熔断器、重试等弹性功能
 */
@Global()
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class ResilienceModule {}
