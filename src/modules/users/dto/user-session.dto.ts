import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户会话响应 DTO
 * 返回用户的登录会话信息
 */
export class UserSessionDto {
  @ApiProperty({
    description: '会话ID',
    example: 'session_123456',
  })
  sessionId: string;

  @ApiProperty({
    description: '设备信息（User Agent）',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  })
  device: string;

  @ApiProperty({
    description: '登录IP地址',
    example: '192.168.1.100',
  })
  ipAddress: string;

  @ApiProperty({
    description: '登录时间',
    example: '2025-10-10T10:30:00.000Z',
  })
  loginAt: Date;

  @ApiProperty({
    description: '最后活跃时间',
    example: '2025-10-10T12:45:00.000Z',
  })
  lastActivity: Date;

  @ApiProperty({
    description: '是否为当前会话',
    example: true,
  })
  isCurrent: boolean;
}
