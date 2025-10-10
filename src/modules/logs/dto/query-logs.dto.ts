import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询 API 日志 DTO
 */
export class QueryApiLogsDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'HTTP 方法', example: 'GET' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: '请求路径', example: '/api/v1/users' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: '状态码', example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional({ description: '用户 ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-10-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-10-09' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 查询错误日志 DTO
 */
export class QueryErrorLogsDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '错误代码', example: 'INTERNAL_ERROR' })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ description: '用户 ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-10-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-10-09' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 查询审计日志 DTO
 */
export class QueryAuditLogsDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '操作类型',
    example: 'UPDATE',
    enum: ['CREATE', 'UPDATE', 'DELETE'],
  })
  @IsOptional()
  @IsEnum(['CREATE', 'UPDATE', 'DELETE'])
  action?: string;

  @ApiPropertyOptional({ description: '资源类型', example: 'user' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: '用户 ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-10-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-10-09' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 创建审计日志 DTO
 */
export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: '用户 ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: '操作类型', example: 'UPDATE' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: '资源类型', example: 'user' })
  @IsString()
  resource: string;

  @ApiPropertyOptional({ description: '资源 ID', example: '123' })
  @IsString()
  resourceId: string;

  @ApiPropertyOptional({ description: '旧数据' })
  @IsOptional()
  oldData?: any;

  @ApiPropertyOptional({ description: '新数据' })
  @IsOptional()
  newData?: any;

  @ApiPropertyOptional({ description: 'IP 地址' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'User Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
