import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

/**
 * 重置密码 DTO
 * 管理员用于重置用户密码，不需要验证旧密码
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: '新密码（至少8位，包含大小写字母、数字和特殊字符）',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(8, { message: '新密码长度不能少于8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '新密码必须包含大小写字母、数字和特殊字符',
  })
  newPassword: string;
}
