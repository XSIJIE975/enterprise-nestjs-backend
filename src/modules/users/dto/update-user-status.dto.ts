import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新用户状态 DTO
 * 管理员用于激活或禁用用户账户
 */
export class UpdateUserStatusDto {
  @ApiProperty({
    description: '用户是否激活（true:激活, false:禁用）',
    example: true,
  })
  @IsBoolean({ message: '用户状态必须是布尔值' })
  isActive: boolean;
}
