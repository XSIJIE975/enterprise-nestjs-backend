import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@/prisma/prisma/client';
import { CircuitBreakerService } from '@/shared/resilience/circuit-breaker.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super({
      datasources: {
        db: {
          url: configService.get('database.url'),
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: any) {
      console.warn('Database connection failed:', error.message);
      // 在开发环境中，可以选择不连接数据库
      if (this.configService.get('app.env') !== 'development') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 使用熔断器执行数据库操作
   *
   * 注意：
   * - 不要包装事务操作（会破坏原子性）
   * - 只用于可能长时间阻塞的关键查询
   * - 熔断打开时会抛出 ServiceUnavailableException
   *
   * @param operation 要执行的数据库操作
   * @returns 操作结果
   */
  async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute('database', operation);
  }
}
