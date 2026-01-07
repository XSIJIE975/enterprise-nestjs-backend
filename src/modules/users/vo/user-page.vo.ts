import { ApiProperty } from '@nestjs/swagger';
import { PaginatedVo } from '@/common/vo';
import { UserResponseVo } from './user-response.vo';

/**
 * 分页用户列表响应 VO
 */
export class UserPageVo extends PaginatedVo<UserResponseVo> {
  @ApiProperty({
    description: '用户列表',
    type: () => [UserResponseVo],
  })
  declare data: UserResponseVo[];
}
