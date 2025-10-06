import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DisableDatabaseLog } from '../../common/decorators/database-log.decorator';

@ApiTags('Health')
@Controller('health')
@DisableDatabaseLog() // 健康检查接口频繁调用，不需要记录数据库日志
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  @ApiResponse({
    status: 200,
    description: '健康检查结果',
  })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.healthService.checkDatabase('database'),
      () => this.healthService.checkRedis('redis'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      // 使用百分比模式：当磁盘使用超过90%时才报告不健康
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9, // 90%使用率阈值，更合理
        }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: '存活性检查' })
  @ApiResponse({
    status: 200,
    description: '应用存活状态',
  })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: '就绪性检查' })
  @ApiResponse({
    status: 200,
    description: '应用就绪状态',
  })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.healthService.checkDatabase('database'),
      () => this.healthService.checkRedis('redis'),
    ]);
  }
}
