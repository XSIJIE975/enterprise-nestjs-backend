import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 成功响应 VO
 * 所有成功的 API 响应都使用此结构
 */
export class ApiSuccessResponse<T = any> {
  @ApiProperty({
    description: '响应码，成功时为 200',
    example: '200',
  })
  code: string;

  @ApiProperty({
    description: '响应消息',
    example: 'success',
  })
  message: string;

  @ApiProperty({
    description: '响应数据',
  })
  data: T;

  @ApiProperty({
    description: '请求 ID，用于日志追踪',
    example: 'uuid-string',
  })
  requestId: string;

  @ApiProperty({
    description: '响应时间戳（使用指定的时区）',
    example: '2025-11-04T10:00:00+08:00',
  })
  timestamp: string;

  @ApiProperty({
    description: '时区（告诉客户端响应中日期字段使用的时区）',
    example: 'Asia/Shanghai',
  })
  timezone: string;
}

/**
 * 错误响应 VO
 * 所有错误的 API 响应都使用此结构
 */
export class ApiErrorResponse {
  @ApiProperty({
    description: '错误码',
    example: 'S10000',
  })
  code: string;

  @ApiProperty({
    description: '错误消息',
    example: '系统内部错误',
  })
  message: string;

  @ApiPropertyOptional({
    description: '错误数据（如验证错误详情等）',
  })
  data?: any;

  @ApiProperty({
    description: '请求 ID，用于日志追踪',
    example: 'uuid-string',
  })
  requestId: string;

  @ApiProperty({
    description: '错误发生的时间戳',
    example: '2025-11-04T10:00:00+08:00',
  })
  timestamp: string;

  @ApiProperty({
    description: '请求路径',
    example: '/api/v1/users',
  })
  path: string;

  @ApiProperty({
    description: '请求方法',
    example: 'POST',
    enum: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  })
  method: string;

  @ApiPropertyOptional({
    description: '时区',
    example: 'Asia/Shanghai',
  })
  timezone?: string;
}

/**
 * 通用 API 响应类型
 * 用于 TypeScript 类型推断，可以是成功响应或错误响应
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
