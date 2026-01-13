import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ArrayNotEmpty, ArrayUnique } from 'class-validator';

export class BatchDeleteRoleDto {
  @ApiProperty({
    description: '角色ID数组',
    example: [1, 2, 3],
  })
  @IsArray({ message: '角色ID必须是数组' })
  @ArrayNotEmpty({ message: '角色ID数组不能为空' })
  @IsNumber({}, { each: true, message: '角色ID必须是数字' })
  @ArrayUnique({ message: '角色ID不能重复' })
  ids: number[];
}
