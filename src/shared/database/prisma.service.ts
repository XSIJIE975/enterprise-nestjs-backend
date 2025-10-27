import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@/prisma/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
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
}
