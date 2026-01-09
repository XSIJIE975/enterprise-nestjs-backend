import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Length,
  Matches,
  IsEmail,
} from 'class-validator';

/**
 * 更新个人资料 DTO
 * 普通用户只能修改自己的基本信息，不能修改敏感字段
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: '用户名（3-20个字符，只能包含字母、数字、下划线）',
    example: 'johndoe',
    minLength: 3,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: '用户名必须是字符串' })
  @Length(3, 20, { message: '用户名长度必须在3-20个字符之间' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username?: string;

  @ApiPropertyOptional({
    description: '名',
    example: 'John',
  })
  @IsOptional()
  @IsString({ message: '名必须是字符串' })
  firstName?: string;

  @ApiPropertyOptional({
    description: '姓',
    example: 'Doe',
  })
  @IsOptional()
  @IsString({ message: '姓必须是字符串' })
  lastName?: string;

  @ApiPropertyOptional({
    description: '手机号（可选，必须是有效的手机号格式）',
    example: '13800138000',
  })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: '头像URL必须是字符串' })
  avatar?: string;
}
