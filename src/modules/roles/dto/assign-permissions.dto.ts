import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @ArrayMinSize(1, { message: '至少需要分配一个权限' })
  @IsInt({ each: true, message: '权限ID必须是整数' })
  permissionIds: number[];
}
