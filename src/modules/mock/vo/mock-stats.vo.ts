import { ApiProperty } from '@nestjs/swagger';

/**
 * Mock 统计信息 VO
 */
export class MockStatsVo {
  @ApiProperty({
    description: 'Mock 端点总数',
    example: 15,
  })
  totalEndpoints: number;

  @ApiProperty({
    description: '已启用的端点数',
    example: 12,
  })
  enabledEndpoints: number;

  @ApiProperty({
    description: '已禁用的端点数',
    example: 3,
  })
  disabledEndpoints: number;

  @ApiProperty({
    description: '总调用次数',
    example: 2456,
  })
  totalCalls: number;

  @ApiProperty({
    description: '最近调用次数',
    example: 100,
  })
  recentCalls: number;

  @ApiProperty({
    description: '平均响应时间(ms)',
    example: 14,
  })
  avgResponseTime: number;

  @ApiProperty({
    description: '缓存命中率(%)',
    example: 92.5,
  })
  cacheHitRate: number;
}
