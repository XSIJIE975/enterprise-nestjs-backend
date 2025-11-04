import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

/**
 * 通用分页响应 DTO 基类
 * 使用泛型 T 来支持任何数据类型
 */
export class PaginatedDto<T> {
  @ApiProperty({
    description: '数据列表',
    type: Array,
  })
  data: T[];

  @ApiProperty({
    description: '分页元数据',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
