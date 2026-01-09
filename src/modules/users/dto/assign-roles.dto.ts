import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分配角色 DTO
 * 管理员用于给用户分配一个或多个角色
 */
export class AssignRolesDto {
  @ApiProperty({
    description: '角色ID数组（至少包含一个角色ID，不能重复）',
    example: [1, 2],
    type: [Number],
  })
  @IsArray({ message: '角色ID必须是数组' })
  @ArrayNotEmpty({ message: '角色ID数组不能为空' })
  @Type(() => Number)
  @IsInt({ each: true, message: '角色ID必须是整数' })
  @ArrayUnique({ message: '角色ID不能重复' })
  roleIds: number[];
}
