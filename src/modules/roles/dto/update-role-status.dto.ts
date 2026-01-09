import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * 更新角色状态 DTO
 */
export class UpdateRoleStatusDto {
  @ApiProperty({
    description: '角色状态（true表示启用，false表示禁用）',
    example: true,
  })
  @IsBoolean({ message: '角色状态必须是布尔值' })
  isActive: boolean;
}
