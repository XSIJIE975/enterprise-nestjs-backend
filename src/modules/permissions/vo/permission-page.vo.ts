import { ApiProperty } from '@nestjs/swagger';
import { PaginatedVo } from '@/common/vo';
import { PermissionResponseVo } from './permission-response.vo';

/**
 * 分页权限列表响应 VO
 */
export class PermissionPageVo extends PaginatedVo<PermissionResponseVo> {
  @ApiProperty({
    description: '权限列表',
    type: () => [PermissionResponseVo],
  })
  declare data: PermissionResponseVo[];
}
