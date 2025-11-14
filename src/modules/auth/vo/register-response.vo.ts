import { ApiProperty } from '@nestjs/swagger';

/**
 * 注册响应 VO
 */
export class RegisterResponseVo {
  @ApiProperty({
    description: '用户名',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '提示信息',
    example: '注册成功，请登录',
  })
  message: string;
}
