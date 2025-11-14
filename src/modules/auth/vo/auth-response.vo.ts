import { ApiProperty } from '@nestjs/swagger';

/**
 * 认证响应 VO
 */
export class AuthResponseVo {
  @ApiProperty({
    description: 'Access Token（访问令牌）',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh Token（刷新令牌）',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token 类型',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Access Token 过期时间（秒）',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description: '用户信息（不包含敏感ID）',
  })
  user: {
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}
