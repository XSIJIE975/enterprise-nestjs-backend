import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询权限列表 DTO
 * 支持分页、搜索、过滤和排序
 */
export class QueryPermissionsDto {
  @ApiPropertyOptional({
    description: '页码（从1开始）',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: '搜索关键词（匹配权限名称、代码、描述）',
    example: 'user',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;

  @ApiPropertyOptional({
    description: '资源类型筛选',
    example: 'user',
  })
  @IsOptional()
  @IsString({ message: '资源类型必须是字符串' })
  resource?: string;

  @ApiPropertyOptional({
    description: '操作动作筛选',
    example: 'create',
  })
  @IsOptional()
  @IsString({ message: '操作动作必须是字符串' })
  action?: string;

  @ApiPropertyOptional({
    description: '权限状态筛选',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '权限状态必须是布尔值' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'name', 'code', 'resource', 'action'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  @IsIn(['createdAt', 'updatedAt', 'name', 'code', 'resource', 'action'], {
    message: '排序字段不合法',
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString({ message: '排序方向必须是字符串' })
  @IsIn(['asc', 'desc'], { message: '排序方向必须是 asc 或 desc' })
  order?: 'asc' | 'desc' = 'desc';
}
