import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from './permission-response.dto';

/**
 * 分页元数据
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

/**
 * 分页权限列表响应 DTO
 * 返回带分页信息的权限列表
 */
export class PaginatedPermissionsDto {
  @ApiProperty({
    description: '权限列表',
    type: [PermissionResponseDto],
  })
  data: PermissionResponseDto[];

  @ApiProperty({
    description: '分页元数据',
    type: PaginationMetaVo,
  })
  meta: PaginationMetaVo;
}
