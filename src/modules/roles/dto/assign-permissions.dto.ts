import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

/**
 * 分配权限给角色 DTO
 */
export class AssignPermissionsDto {
  @ApiProperty({
    description: '权限ID列表',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray({ message: '权限ID列表必须是数组' })
  @IsInt({ each: true, message: '权限ID必须是整数' })
  permissionIds: number[];
}
