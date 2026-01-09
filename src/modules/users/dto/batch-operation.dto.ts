import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty, ArrayUnique } from 'class-validator';

/**
 * 批量操作 DTO
 * 用于批量删除等操作
 */
export class BatchOperationDto {
  @ApiProperty({
    description: '用户ID数组（UUID格式，至少包含一个ID，不能重复）',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    ],
    type: [String],
  })
  @IsArray({ message: '用户ID必须是数组' })
  @ArrayNotEmpty({ message: '用户ID数组不能为空' })
  @IsString({ each: true, message: '用户ID必须是字符串（UUID格式）' })
  @ArrayUnique({ message: '用户ID不能重复' })
  ids: string[];
}
