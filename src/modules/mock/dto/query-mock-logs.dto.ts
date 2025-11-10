import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询 Mock 日志 DTO
 */
export class QueryMockLogsDto {
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
    description: 'Mock 端点 ID (精确匹配)',
    example: 'cm001',
  })
  @IsOptional()
  @IsString()
  endpointId?: string;

  @ApiPropertyOptional({
    description: '请求方法 (精确匹配)',
    example: 'GET',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'],
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({
    description: '请求路径 (模糊匹配)',
    example: '/users',
  })
  @IsOptional()
  @IsString()
  path?: string;
}
