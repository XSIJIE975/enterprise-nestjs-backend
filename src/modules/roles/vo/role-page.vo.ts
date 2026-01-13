import { ApiProperty } from '@nestjs/swagger';
import { PaginatedVo } from '@/common/vo';
import { RoleResponseVo } from './role-response.vo';

/**
 * 角色列表响应 VO
 */
export class RolePageVo extends PaginatedVo<RoleResponseVo> {
  @ApiProperty({
    description: '角色列表',
    type: () => [RoleResponseVo],
  })
  declare data: RoleResponseVo[];
}
