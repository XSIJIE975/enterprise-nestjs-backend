import { ApiProperty } from '@nestjs/swagger';

/**
 * 状态码统计 VO
 */
class StatusCodeStatVo {
  @ApiProperty({
    description: 'HTTP 状态码',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: '出现次数',
    example: 1523,
  })
  count: number;
}

/**
 * 日志统计信息 VO
 */
export class LogStatisticsVo {
  @ApiProperty({
    description: 'API 日志总数',
    example: 5000,
  })
  totalApiLogs: number;

  @ApiProperty({
    description: '错误日志总数',
    example: 150,
  })
  totalErrorLogs: number;

  @ApiProperty({
    description: '审计日志总数',
    example: 800,
  })
  totalAuditLogs: number;

  @ApiProperty({
    description: '状态码统计',
    type: [StatusCodeStatVo],
  })
  statusCodeStats: StatusCodeStatVo[];
}
