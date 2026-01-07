import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询用户列表 DTO
 * 支持分页、搜索、过滤和排序
 */
export class QueryUsersDto {
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
    description: '搜索关键词（匹配用户名、邮箱、姓名）',
    example: 'john',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;

  @ApiPropertyOptional({
    description: '用户状态筛选',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: '用户状态必须是布尔值' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '邮箱验证状态筛选',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: '邮箱验证状态必须是布尔值' })
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: '角色代码筛选（例如：admin, user）',
    example: 'admin',
  })
  @IsOptional()
  @IsString({ message: '角色代码必须是字符串' })
  role?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'lastLoginAt', 'email', 'username'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  @IsIn(['createdAt', 'updatedAt', 'lastLoginAt', 'email', 'username'], {
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
