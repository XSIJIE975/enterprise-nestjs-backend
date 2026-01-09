import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus';

/**
 * 健康检查详情 VO
 */
export class HealthCheckVo implements HealthCheckResult {
  @ApiProperty({
    description: '整体状态',
    enum: ['error', 'ok', 'shutting_down'],
    example: 'ok',
  })
  status: HealthCheckStatus;

  @ApiProperty({
    description: '健康指标信息（状态为 up 的服务）',
    example: {
      database: { status: 'up' },
      redis: { status: 'up' },
    },
    required: false,
  })
  info?: Record<string, any>;

  @ApiProperty({
    description: '错误指标信息（状态为 down 的服务）',
    example: {},
    required: false,
  })
  error?: Record<string, any>;

  @ApiProperty({
    description: '所有指标详情',
    example: {
      database: { status: 'up' },
      redis: { status: 'up' },
      memory_heap: { status: 'up', used: 150000000 },
    },
  })
  details: Record<string, any>;
}
