import { ApiProperty } from '@nestjs/swagger';

/**
 * 存活检查响应 VO
 */
export class LivenessVo {
  @ApiProperty({
    description: '状态',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: '检查时间戳',
    example: '2024-01-09T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '运行时间（秒）',
    example: 3600.5,
  })
  uptime: number;
}
