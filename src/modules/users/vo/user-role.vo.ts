import { ApiProperty } from '@nestjs/swagger';

/**
 * @description 用户角色响应 VO
 */
export class UserRoleVo {
  @ApiProperty({
    description: '角色 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '角色编码',
    example: 'admin',
  })
  code: string;

  @ApiProperty({
    description: '角色名称',
    example: '超级管理员',
  })
  name: string;

  @ApiProperty({
    description: '角色描述',
    example: '系统超级管理员，拥有所有权限',
  })
  description: string;

  @ApiProperty({
    description: '创建时间',
    example: '2025-10-23T16:31:53.069+08:00',
  })
  createdAt: Date;
}
