import { ApiProperty } from '@nestjs/swagger';
import type { TemplateEngineType } from '../engines/base.engine';
import type { IMockEndpoint } from '../interfaces/mock-endpoint.interface';

export class MockEndpointVo {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  delay!: number;

  // hide raw responseTemplate for safety; optional
  @ApiProperty({ required: false, nullable: true })
  responseTemplate?: string | null;

  @ApiProperty()
  templateEngine!: TemplateEngineType | string;

  @ApiProperty({ required: false, nullable: true })
  headers?: Record<string, string> | null;

  @ApiProperty({ required: false, nullable: true })
  validation?: unknown | null;

  @ApiProperty({ required: false, nullable: true })
  createdBy?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
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
