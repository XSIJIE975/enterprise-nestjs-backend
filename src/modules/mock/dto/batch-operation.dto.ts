import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMockEndpointDto } from './create-mock-endpoint.dto';

/**
 * 批量操作 DTO
 */
export class BatchOperationMockEndpointsDto {
  @ApiProperty({
    description: 'Mock 端点 ID 列表',
    example: ['cm001', 'cm002', 'cm003'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'ID 列表不能为空' })
  @IsString({ each: true, message: '每个 ID 必须是字符串' })
  ids: string[];
}

/**
 * 导入配置 DTO
 */
export class ImportConfigDto {
  @ApiProperty({
    description: 'Mock 端点配置列表',
    type: [CreateMockEndpointDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '配置列表不能为空' })
  @Type(() => CreateMockEndpointDto)
  endpoints: CreateMockEndpointDto[];

  @ApiPropertyOptional({
    description: '是否覆盖已存在的配置 (相同 path + method)',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
