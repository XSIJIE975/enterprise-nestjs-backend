import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户响应 DTO
 * 注意：不包含敏感信息
 */
export class UserResponseDto {
  @ApiProperty({
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '用户名',
    example: 'johndoe',
  })
  username: string;

  @ApiPropertyOptional({
    description: '名',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: '姓',
    example: 'Doe',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: '头像 URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  phone?: string;

  @ApiProperty({
    description: '账户是否激活',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '账户是否已验证',
    example: true,
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: '最后登录时间',
    example: '2025-10-09T10:00:00.000Z',
  })
  lastLoginAt?: Date;

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

  @ApiPropertyOptional({
    description: '用户角色列表',
    type: [String],
    example: ['admin', 'user'],
  })
  roles?: string[];
}
