import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';

/**
 * 自定义验证器: 验证字段是否为字符串或对象
 */
function IsStringOrObject(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isStringOrObject',
      validator: {
        validate: (value: any) => {
          return typeof value === 'string' || typeof value === 'object';
        },
        defaultMessage: () => {
          return '字段必须是字符串或对象类型';
        },
      },
    },
    validationOptions,
  );
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
type TemplateEngine = 'MOCKJS' | 'JSON';

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
    description: '响应模板 (支持 JSON 对象或 JSON 字符串)',
    example: { code: 200, data: [] },
  })
  @IsOptional()
  @IsStringOrObject({ message: '响应模板必须是字符串或对象类型' })
  responseTemplate?: string | object;

  @ApiPropertyOptional({
    description: '模板引擎类型',
    enum: ['MOCKJS', 'JSON'],
    example: 'MOCKJS',
  })
  @IsOptional()
  @IsEnum(['MOCKJS', 'JSON'])
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
