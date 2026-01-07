import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedVo } from '@/common/vo';

/**
 * API 日志 VO - 用户信息
 */
export class ApiLogUserVo {
  @ApiProperty({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: '用户名',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: '邮箱',
    example: 'user@example.com',
  })
  email: string;
}

/**
 * API 日志详情 VO
 */
export class ApiLogVo {
  @ApiProperty({
    description: '日志 ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: '请求 ID（唯一标识）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  requestId: string;

  @ApiPropertyOptional({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'HTTP 方法',
    example: 'GET',
  })
  method: string;

  @ApiProperty({
    description: '请求路径',
    example: '/api/v1/users',
  })
  url: string;

  @ApiPropertyOptional({
    description: '请求参数',
    example: { page: 1, pageSize: 20 },
    nullable: true,
  })
  params: any;

  @ApiPropertyOptional({
    description: '请求体',
    example: { username: 'johndoe' },
    nullable: true,
  })
  body: any;

  @ApiPropertyOptional({
    description: '响应数据',
    example: { success: true, data: [] },
    nullable: true,
  })
  response: any;

  @ApiProperty({
    description: 'HTTP 状态码',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: '请求耗时（毫秒）',
    example: 125,
  })
  duration: number;

  @ApiProperty({
    description: '客户端 IP',
    example: '192.168.1.100',
  })
  ip: string;

  @ApiPropertyOptional({
    description: 'User Agent',
    example: 'Mozilla/5.0...',
    nullable: true,
  })
  userAgent: string | null;

  @ApiPropertyOptional({
    description: '错误信息',
    example: null,
    nullable: true,
  })
  error: string | null;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-15T08:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: '用户信息',
    type: ApiLogUserVo,
    nullable: true,
  })
  user?: ApiLogUserVo | null;
}

/**
 * API 日志分页响应 VO
 */
export class ApiLogPageVo extends PaginatedVo<ApiLogVo> {
  @ApiProperty({
    description: 'API 日志列表',
    type: () => [ApiLogVo],
  })
  declare data: ApiLogVo[];
}
