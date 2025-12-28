import { ApiProperty } from '@nestjs/swagger';

/**
 * Mock 日志 VO
 */
export class MockLogVo {
  @ApiProperty({
    description: '日志 ID',
    example: 'log001',
  })
  id: string;

  @ApiProperty({
    description: 'Mock 端点 ID',
    example: 'cm001',
    required: false,
  })
  endpointId?: string;

  @ApiProperty({
    description: '请求方法',
    example: 'GET',
  })
  method: string;

  @ApiProperty({
    description: '请求路径',
    example: '/api/mock/users',
  })
  path: string;

  @ApiProperty({
    description: 'Query 参数',
    example: { page: 1, pageSize: 10 },
    required: false,
  })
  query?: any;

  @ApiProperty({
    description: 'Body 参数',
    required: false,
  })
  body?: any;

  @ApiProperty({
    description: '请求头',
    required: false,
  })
  headers?: any;

  @ApiProperty({
    description: '客户端 IP',
    example: '127.0.0.1',
    required: false,
  })
  ip?: string;

  @ApiProperty({
    description: '响应数据',
    required: false,
  })
  response?: any;

  @ApiProperty({
    description: '响应状态码',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: '执行时长(ms)',
    example: 15,
  })
  duration: number;

  @ApiProperty({
    description: '是否缓存命中',
    example: true,
  })
  cacheHit: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-10T10:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * 分页信息 VO
 */
export class PaginationVo {
  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: '总记录数',
    example: 156,
  })
  total: number;

  @ApiProperty({
    description: '总页数',
    example: 8,
  })
  totalPages: number;
}

/**
 * Mock 日志列表响应 VO
 */
export class MockLogListVo {
  @ApiProperty({
    description: '日志列表',
    type: [MockLogVo],
  })
  list: MockLogVo[];

  @ApiProperty({
    description: '分页信息',
    type: PaginationVo,
  })
  pagination: PaginationVo;
}

/**
 * 清除日志结果 VO
 */
export class ClearLogsResultVo {
  @ApiProperty({
    description: '消息',
    example: 'Logs cleared',
  })
  message: string;

  @ApiProperty({
    description: '删除数量',
    example: 100,
  })
  deleted: number;
}
