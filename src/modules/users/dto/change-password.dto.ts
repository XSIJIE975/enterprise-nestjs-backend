import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

/**
 * 修改密码 DTO
 * 用于用户自己修改密码，需要验证旧密码
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码',
    example: 'OldPassword123!',
  })
  @IsString({ message: '当前密码必须是字符串' })
  oldPassword: string;

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

  @ApiProperty({
    description: '确认新密码（必须与新密码一致）',
    example: 'NewPassword123!',
  })
  @IsString({ message: '确认密码必须是字符串' })
  confirmPassword: string;
}
