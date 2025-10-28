import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from './role-response.dto';

/**
 * 分页角色响应 DTO
 */
export class PaginatedRolesDto {
  @ApiProperty({
    description: '角色数据列表',
    type: [RoleResponseDto],
  })
  data: RoleResponseDto[];

  @ApiProperty({
    description: '分页信息',
    properties: {
      page: {
        description: '当前页码',
        example: 1,
        type: 'number',
      },
      pageSize: {
        description: '每页数量',
        example: 10,
        type: 'number',
      },
      total: {
        description: '总记录数',
        example: 100,
        type: 'number',
      },
      totalPages: {
        description: '总页数',
        example: 10,
        type: 'number',
      },
      hasNext: {
        description: '是否有下一页',
        example: true,
        type: 'boolean',
      },
      hasPrev: {
        description: '是否有上一页',
        example: false,
        type: 'boolean',
      },
    },
  })
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
