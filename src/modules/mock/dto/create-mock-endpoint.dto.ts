import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class CreateMockEndpointDto {
  @ApiProperty({
    description: 'Mock 端点名称',
    example: '获取用户列表',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Mock 端点描述',
    example: '返回用户列表的 Mock 数据',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Mock 端点路径 (支持动态参数, 如 /users/:id)',
    example: '/users',
    pattern: '^/[a-zA-Z0-9/:_-]*$',
  })
  @IsString()
  @Matches(/^\/[a-zA-Z0-9/:_-]*$/, {
    message: '路径格式不正确，必须以 / 开头',
  })
  path: string;

  @ApiProperty({
    description: 'HTTP 请求方法',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'],
    example: 'GET',
    default: 'GET',
  })
  @IsEnum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'], {
    message: '请求方法必须是 GET, POST, PUT, DELETE, PATCH 或 ALL',
  })
  method: HttpMethod = 'GET';

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiProperty({
    description: 'HTTP 响应状态码',
    example: 200,
    minimum: 100,
    maximum: 599,
    default: 200,
  })
  @IsInt()
  @Min(100, { message: '状态码必须大于等于 100' })
  @Max(599, { message: '状态码必须小于等于 599' })
  statusCode: number = 200;

  @ApiProperty({
    description: '响应延迟时间(毫秒)',
    example: 0,
    minimum: 0,
    maximum: 10000,
    default: 0,
  })
  @IsInt()
  @Min(0, { message: '延迟时间不能为负数' })
  @Max(10000, { message: '延迟时间不能超过 10 秒' })
  delay: number = 0;

  @ApiProperty({
    description: '响应模板 (支持 JSON 对象或 JSON 字符串, 支持 MockJS 语法)',
    example: { code: 200, 'data|10': [{ 'id|+1': 1, name: '@cname' }] },
  })
  @IsStringOrObject({ message: '响应模板必须是字符串或对象类型' })
  responseTemplate: string | object;

  @ApiPropertyOptional({
    description: '模板引擎类型',
    enum: ['MOCKJS', 'JSON'],
    example: 'MOCKJS',
    default: 'MOCKJS',
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
    description: '请求参数校验规则 (JSON Schema)',
    example: { type: 'object', properties: { id: { type: 'string' } } },
  })
  @IsOptional()
  validation?: any;

  @ApiPropertyOptional({
    description: '创建人',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
