import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
type TemplateEngine = 'MOCKJS' | 'JSON' | 'HANDLEBARS';

export class UpdateMockEndpointDto {
  @ApiPropertyOptional({
    description: 'Mock 端点名称',
    example: '获取用户列表',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Mock 端点描述',
    example: '返回用户列表的 Mock 数据',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'HTTP 请求方法',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'],
    example: 'GET',
  })
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'])
  method?: HttpMethod;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'HTTP 响应状态码',
    example: 200,
    minimum: 100,
    maximum: 599,
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @ApiPropertyOptional({
    description: '响应延迟时间(毫秒)',
    example: 0,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  delay?: number;

  @ApiPropertyOptional({
    description: '响应模板 (JSON 字符串)',
    example: '{"code": 200, "data": []}',
  })
  @IsOptional()
  @IsString()
  responseTemplate?: string;

  @ApiPropertyOptional({
    description: '模板引擎类型',
    enum: ['MOCKJS', 'JSON', 'HANDLEBARS'],
    example: 'MOCKJS',
  })
  @IsOptional()
  @IsEnum(['MOCKJS', 'JSON', 'HANDLEBARS'])
  templateEngine?: TemplateEngine;

  @ApiPropertyOptional({
    description: '自定义响应头',
    example: { 'X-Custom-Header': 'value' },
  })
  @IsOptional()
  headers?: any;

  @ApiPropertyOptional({
    description: '请求参数校验规则',
  })
  @IsOptional()
  validation?: any;
}
