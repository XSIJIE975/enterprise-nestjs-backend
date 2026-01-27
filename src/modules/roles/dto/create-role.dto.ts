import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称（唯一，用于显示）',
    example: '系统管理员',
  })
  @IsString({ message: '角色名称必须是字符串' })
  @Length(1, 100, { message: '角色名称长度必须在1-100个字符之间' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @ApiProperty({
    description: '角色代码（唯一，用于程序识别，如"ADMIN"）',
    example: 'ADMIN',
  })
  @IsString({ message: '角色代码必须是字符串' })
  @Length(1, 50, { message: '角色代码长度必须在1-50个字符之间' })
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: '角色代码只能包含字母、数字和下划线',
  })
  @IsNotEmpty({ message: '角色代码不能为空' })
  code: string;

  @ApiPropertyOptional({
    description: '角色描述（详细说明角色的职责和权限范围）',
    example: '拥有系统最高权限，可以管理所有功能',
  })
  @IsOptional()
  @IsString({ message: '角色描述必须是字符串' })
  @Length(0, 500, { message: '角色描述长度不能超过500个字符' })
  description?: string;
}
