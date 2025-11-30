import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedDto } from '@/common/dtos/paginated.dto';

/**
 * 审计日志详情 VO
 */
export class AuditLogVo {
  @ApiProperty({
    description: '日志 ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiPropertyOptional({
    description: '用户 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: '操作类型',
    example: 'UPDATE',
    enum: ['CREATE', 'UPDATE', 'DELETE'],
  })
  action: string;

  @ApiProperty({
    description: '资源类型',
    example: 'user',
  })
  resource: string;

  @ApiProperty({
    description: '资源 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  resourceId: string;

  @ApiPropertyOptional({
    description: '修改前的数据',
    example: { username: 'oldname', email: 'old@example.com' },
    nullable: true,
  })
  oldData: any;

  @ApiPropertyOptional({
    description: '修改后的数据',
    example: { username: 'newname', email: 'new@example.com' },
    nullable: true,
  })
  newData: any;

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
 * 审计日志分页响应 VO
 */
export class AuditLogPageVo extends PaginatedDto<AuditLogVo> {
  @ApiProperty({
    description: '审计日志列表',
    type: () => [AuditLogVo],
  })
  declare data: AuditLogVo[];
}
