import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户统计响应 DTO
 * 返回用户相关的统计数据
 */
export class UserStatisticsDto {
  @ApiProperty({
    description: '用户总数',
    example: 1000,
  })
  total: number;

  @ApiProperty({
    description: '活跃用户数',
    example: 850,
  })
  active: number;

  @ApiProperty({
    description: '禁用用户数',
    example: 150,
  })
  inactive: number;

  @ApiProperty({
    description: '已验证邮箱用户数',
    example: 900,
  })
  verified: number;

  @ApiProperty({
    description: '未验证邮箱用户数',
    example: 100,
  })
  unverified: number;

  @ApiProperty({
    description: '今日新增用户数',
    example: 15,
  })
  newToday: number;

  @ApiProperty({
    description: '本周新增用户数',
    example: 50,
  })
  newThisWeek: number;

  @ApiProperty({
    description: '本月新增用户数',
    example: 200,
  })
  newThisMonth: number;
}
