import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/**
 * 更新用户 DTO
 */
export class UpdateUserDto {
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
  @IsString({ message: '用户名必须是字符串' })
  @Length(3, 20, { message: '用户名长度必须在3-20个字符之间' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名只能包含字母、数字和下划线',
  })
  @IsOptional()
  username?: string;

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
    description: '头像 URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString({ message: '头像必须是字符串' })
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString({ message: '手机号码必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式不正确' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: '账户是否激活',
    example: true,
  })
  @IsBoolean({ message: '激活状态必须是布尔值' })
  @IsOptional()
  isActive?: boolean;
}
