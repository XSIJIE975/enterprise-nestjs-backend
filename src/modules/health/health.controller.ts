import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import * as path from 'path';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { DisableDatabaseLog } from '@/common/decorators/database-log.decorator';
import { ApiSuccessResponseDecorator } from '@/common/decorators/swagger-response.decorator';
import { HealthService } from './health.service';
import { HealthCheckVo } from './vo/health-check.vo';
import { LivenessVo } from './vo/liveness.vo';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
@DisableDatabaseLog()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private healthService: HealthService,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  @ApiSuccessResponseDecorator(HealthCheckVo, {
    description: '系统健康检查详细结果',
  })
  @HealthCheck()
  async check(): Promise<HealthCheckVo> {
    const memoryHeap = this.configService.get<number>('health.memory.heap');
    const memoryRss = this.configService.get<number>('health.memory.rss');
    const diskThreshold = this.configService.get<number>(
      'health.disk.threshold',
    );

    return this.health.check([
      () => this.healthService.checkDatabase('database'),
      () => this.healthService.checkRedis('redis'),
      () => this.memory.checkHeap('memory_heap', memoryHeap),
      () => this.memory.checkRSS('memory_rss', memoryRss),
      // 检查应用当前所在磁盘/分区的剩余空间状态
      () =>
        this.healthService.checkDiskStorage('storage', {
          path: path.parse(process.cwd()).root,
          threshold: diskThreshold,
        }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: '存活性检查' })
  @ApiSuccessResponseDecorator(LivenessVo, {
    description: '应用存活状态',
  })
  liveness(): LivenessVo {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: '就绪性检查' })
  @ApiSuccessResponseDecorator(HealthCheckVo, {
    description: '应用就绪状态（检查关键依赖）',
  })
  @HealthCheck()
  async readiness(): Promise<HealthCheckVo> {
    return this.health.check([
      () => this.healthService.checkDatabase('database'),
      () => this.healthService.checkRedis('redis'),
    ]);
  }
}
