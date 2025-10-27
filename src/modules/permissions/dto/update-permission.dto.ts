import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 更新权限 DTO
 */
export class UpdatePermissionDto {
  @ApiPropertyOptional({
    description: '权限名称（唯一，用于显示）',
    example: '创建用户',
  })
  @IsString({ message: '权限名称必须是字符串' })
  @Length(1, 100, { message: '权限名称长度必须在1-100个字符之间' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '权限代码（唯一，用于程序识别，如"user:create"）',
    example: 'user:create',
  })
  @IsString({ message: '权限代码必须是字符串' })
  @Length(1, 100, { message: '权限代码长度必须在1-100个字符之间' })
  @Matches(/^[a-zA-Z0-9_:]+$/, {
    message: '权限代码只能包含字母、数字、冒号和下划线',
  })
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: '资源类型（权限所属的资源，如"user"、"role"）',
    example: 'user',
  })
  @IsString({ message: '资源类型必须是字符串' })
  @Length(1, 50, { message: '资源类型长度必须在1-50个字符之间' })
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({
    description:
      '操作动作（对资源的操作类型，如"create"、"read"、"update"、"delete"）',
    example: 'create',
  })
  @IsString({ message: '操作动作必须是字符串' })
  @Length(1, 50, { message: '操作动作长度必须在1-50个字符之间' })
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    description: '权限描述（详细说明权限的作用范围）',
    example: '允许创建新用户账户',
  })
  @IsString({ message: '权限描述必须是字符串' })
  @Length(0, 500, { message: '权限描述长度不能超过500个字符' })
  @IsOptional()
  description?: string;
}
