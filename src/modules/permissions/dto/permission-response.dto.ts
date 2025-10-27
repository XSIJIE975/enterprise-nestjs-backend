import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 权限响应 DTO
 */
export class PermissionResponseDto {
  @ApiProperty({
    description: '权限ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '权限名称',
    example: '创建用户',
  })
  name: string;

  @ApiProperty({
    description: '权限代码',
    example: 'user:create',
  })
  code: string;

  @ApiProperty({
    description: '资源类型',
    example: 'user',
  })
  resource: string;

  @ApiProperty({
    description: '操作动作',
    example: 'create',
  })
  action: string;

  @ApiPropertyOptional({
    description: '权限描述',
    example: '允许创建新用户账户',
  })
  description?: string;

  @ApiProperty({
    description: '权限状态',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2025-10-09T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-10-09T10:00:00.000Z',
  })
  updatedAt: Date;
}
