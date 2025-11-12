import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TemplateEngineType } from '../engines/base.engine';
import type { IMockEndpoint } from '../interfaces/mock-endpoint.interface';

export class MockEndpointVo {
  @ApiProperty({
    description: 'Mock 端点 ID',
    example: 'cm001',
  })
  id!: string;

  @ApiProperty({
    description: 'Mock 端点名称',
    example: '获取用户列表',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Mock 端点描述',
    example: '返回用户列表的 Mock 数据',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Mock 端点路径',
    example: '/users',
  })
  path!: string;

  @ApiProperty({
    description: 'HTTP 请求方法',
    example: 'GET',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'],
  })
  method!: string;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'HTTP 响应状态码',
    example: 200,
  })
  statusCode!: number;

  @ApiProperty({
    description: '响应延迟时间(毫秒)',
    example: 0,
  })
  delay!: number;

  @ApiPropertyOptional({
    description: '响应模板',
    example: '{"code": 200, "data": []}',
  })
  responseTemplate?: string | null;

  @ApiProperty({
    description: '模板引擎类型',
    example: 'MOCKJS',
    enum: ['MOCKJS', 'JSON'],
  })
  templateEngine!: TemplateEngineType | string;

  @ApiPropertyOptional({
    description: '自定义响应头',
    example: { 'X-Custom-Header': 'value' },
  })
  headers?: Record<string, string> | null;

  @ApiPropertyOptional({
    description: '请求参数校验规则',
    example: { type: 'object', properties: { id: { type: 'string' } } },
  })
  validation?: unknown | null;

  @ApiPropertyOptional({
    description: '创建人',
    example: 'admin',
  })
  createdBy?: string | null;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-10T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-11-10T10:05:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: '版本号',
    example: 1,
  })
  version!: number;

  static from(e: IMockEndpoint): MockEndpointVo {
    const vo = new MockEndpointVo();
    vo.id = e.id;
    vo.name = e.name;
    vo.description = (e as any).description ?? null;
    vo.path = e.path;
    vo.method = e.method;
    vo.enabled = e.enabled;
    vo.statusCode = e.statusCode;
    vo.delay = e.delay;
    vo.responseTemplate = e.responseTemplate ?? null;
    vo.templateEngine = e.templateEngine;
    vo.headers = (e.headers as Record<string, string>) ?? null;
    vo.validation = (e.validation as unknown) ?? null;
    vo.createdBy = (e as any).createdBy ?? null;
    vo.createdAt = (e as any).createdAt;
    vo.updatedAt = (e as any).updatedAt;
    vo.version = e.version;
    return vo;
  }
}
