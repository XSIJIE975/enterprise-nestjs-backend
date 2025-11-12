import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询 Mock 端点列表 DTO
 */
export class QueryMockEndpointsDto {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于等于 1' })
  @Max(100, { message: '每页数量不能超过 100' })
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '关键字搜索 (匹配名称、描述、路径)',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '请求方法筛选',
    example: 'GET',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'],
  })
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'])
  method?: string;

  @ApiPropertyOptional({
    description: '模板引擎筛选',
    example: 'MOCKJS',
    enum: ['MOCKJS', 'JSON'],
  })
  @IsOptional()
  @IsEnum(['MOCKJS', 'JSON'])
  templateEngine?: string;

  @ApiPropertyOptional({
    description: '启用状态筛选',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '创建人筛选',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
