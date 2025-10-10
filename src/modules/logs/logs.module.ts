import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { DatabaseModule } from '../../shared/database/database.module';

/**
 * 日志模块
 * 提供日志记录和查询功能
 */
@Module({
  imports: [DatabaseModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
