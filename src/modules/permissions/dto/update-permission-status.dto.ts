import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * 更新权限状态 DTO
 */
export class UpdatePermissionStatusDto {
  @ApiProperty({
    description: '权限状态（true表示启用，false表示禁用）',
    example: true,
  })
  @IsBoolean({ message: '权限状态必须是布尔值' })
  isActive: boolean;
}
