import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户登录 DTO
 */
export class LoginDto {
  @ApiProperty({
    description: '用户名或邮箱',
    example: 'admin@enterprise.local',
  })
  @IsString({ message: '用户名或邮箱必须是字符串' })
  @IsNotEmpty({ message: '用户名或邮箱不能为空' })
  username: string;

  @ApiProperty({
    description: '密码',
    example: 'admin123456',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
