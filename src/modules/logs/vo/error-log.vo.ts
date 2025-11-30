import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedDto } from '@/common/dtos/paginated.dto';

/**
 * 错误日志详情 VO
 */
export class ErrorLogVo {
  @ApiProperty({
    description: '日志 ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiPropertyOptional({
    description: '请求 ID（关联 API 日志）',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  requestId: string | null;

  @ApiPropertyOptional({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: '错误代码',
    example: 'USER_NOT_FOUND',
  })
  errorCode: string;

  @ApiProperty({
    description: '错误消息',
    example: '用户不存在',
  })
  message: string;

  @ApiPropertyOptional({
    description: '错误堆栈',
    example: 'Error: User not found\n    at UserService.findOne...',
    nullable: true,
  })
  stack: string | null;

  @ApiPropertyOptional({
    description: '错误上下文（额外信息）',
    example: { userId: '123', operation: 'findUser' },
    nullable: true,
  })
  context: any;

  @ApiPropertyOptional({
    description: '客户端 IP',
    example: '192.168.1.100',
    nullable: true,
  })
  ip: string | null;

  @ApiPropertyOptional({
    description: 'User Agent',
    example: 'Mozilla/5.0...',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-15T08:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * 错误日志分页响应 VO
 */
export class ErrorLogPageVo extends PaginatedDto<ErrorLogVo> {
  @ApiProperty({
    description: '错误日志列表',
    type: () => [ErrorLogVo],
  })
  declare data: ErrorLogVo[];
}
