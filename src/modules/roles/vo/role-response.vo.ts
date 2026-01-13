import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 角色响应 VO
 */
export class RoleResponseVo {
  @ApiProperty({
    description: '角色ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '角色名称',
    example: '系统管理员',
  })
  name: string;

  @ApiProperty({
    description: '角色代码',
    example: 'ADMIN',
  })
  code: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '拥有系统最高权限，可以管理所有功能',
  })
  description?: string;

  @ApiProperty({
    description: '角色状态',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '关联的权限列表',
    type: [Object],
  })
  permissions?: any[];
}
