import { ApiProperty } from '@nestjs/swagger';

/**
 * 分页元数据 VO
 * 在分页响应中返回分页信息
 */
export class PaginationMetaVo {
  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '总页数',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: '是否有上一页',
    example: false,
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: '是否有下一页',
    example: true,
  })
  hasNextPage: boolean;
}
