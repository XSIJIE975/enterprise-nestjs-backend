import { IsArray, IsInt, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 批量操作 DTO
 * 用于批量删除等操作
 */
export class BatchOperationDto {
  @ApiProperty({
    description: '用户ID数组（至少包含一个ID，不能重复）',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray({ message: '用户ID必须是数组' })
  @ArrayNotEmpty({ message: '用户ID数组不能为空' })
  @Type(() => Number)
  @IsInt({ each: true, message: '用户ID必须是整数' })
  @ArrayUnique({ message: '用户ID不能重复' })
  ids: number[];
}
