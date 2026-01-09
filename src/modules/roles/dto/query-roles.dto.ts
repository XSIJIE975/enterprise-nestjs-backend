import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 查询角色 DTO
 */
export class QueryRolesDto {
  @ApiPropertyOptional({
    description: '页码（从1开始）',
    example: 1,
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
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: '搜索关键词（支持角色名称、代码、描述的模糊搜索）',
    example: '管理员',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;

  @ApiPropertyOptional({
    description: '角色状态筛选',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: '角色状态必须是布尔值' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'name', 'code'],
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: '排序方向必须是字符串' })
  order?: 'asc' | 'desc' = 'desc';
}
