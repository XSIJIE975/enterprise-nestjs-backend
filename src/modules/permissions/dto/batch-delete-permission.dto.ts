import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ArrayNotEmpty, ArrayUnique } from 'class-validator';

export class BatchDeletePermissionDto {
  @ApiProperty({
    description: '权限ID数组',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray({ message: '权限ID必须是数组' })
  @ArrayNotEmpty({ message: '权限ID数组不能为空' })
  @IsNumber({}, { each: true, message: '权限ID必须是数字' })
  @ArrayUnique({ message: '权限ID不能重复' })
  ids: number[];
}
