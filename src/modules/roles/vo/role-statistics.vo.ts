import { ApiProperty } from '@nestjs/swagger';

export class RoleStatisticsVo {
  @ApiProperty({ description: '角色总数' })
  total: number;

  @ApiProperty({ description: '激活角色数' })
  active: number;

  @ApiProperty({ description: '禁用角色数' })
  inactive: number;
}
