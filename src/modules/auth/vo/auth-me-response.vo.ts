import { ApiProperty } from '@nestjs/swagger';
import type { JwtUser } from '../interfaces/jwt-payload.interface';

/**
 * 获取当前用户信息响应 VO
 */
export class AuthMeResponseVo {
  @ApiProperty({
    description: '用户名',
    type: 'string',
    example: 'JohnDoe',
  })
  username: JwtUser['username'];
  @ApiProperty({
    description: '邮箱地址',
    type: 'string',
    example: 'example@example.com',
  })
  email: JwtUser['email'];
  @ApiProperty({
    description: '用户角色列表',
    type: 'array',
    example: ['admin', 'user'],
  })
  roles: JwtUser['roles'];
  @ApiProperty({
    description: '用户权限列表',
    type: 'array',
    example: ['read:articles', 'write:articles'],
  })
  permissions: JwtUser['permissions'];
}
