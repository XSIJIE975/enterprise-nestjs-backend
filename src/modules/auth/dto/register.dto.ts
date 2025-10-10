import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户注册 DTO
 */
export class RegisterDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '用户名（3-20个字符，只能包含字母、数字、下划线）',
    example: 'johndoe',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: '用户名必须是字符串' })
  @Length(3, 20, { message: '用户名长度必须在3-20个字符之间' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名只能包含字母、数字和下划线',
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({
    description: '密码（8-32个字符，必须包含大小写字母和数字）',
    example: 'Password123',
    minLength: 8,
    maxLength: 32,
  })
  @IsString({ message: '密码必须是字符串' })
  @Length(8, 32, { message: '密码长度必须在8-32个字符之间' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: '密码必须包含至少一个大写字母、一个小写字母和一个数字',
  })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @ApiPropertyOptional({
    description: '名',
    example: 'John',
  })
  @IsString({ message: '名必须是字符串' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: '姓',
    example: 'Doe',
  })
  @IsString({ message: '姓必须是字符串' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString({ message: '手机号码必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式不正确' })
  @IsOptional()
  phone?: string;
}
