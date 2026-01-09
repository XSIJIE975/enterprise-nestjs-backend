import { ApiProperty } from '@nestjs/swagger';

class ResourceCount {
  @ApiProperty({ description: '资源类型' })
  resource: string;

  @ApiProperty({ description: '权限数量' })
  count: number;
}

export class PermissionStatisticsVo {
  @ApiProperty({ description: '总权限数' })
  total: number;

  @ApiProperty({ description: '启用状态权限数' })
  active: number;

  @ApiProperty({ description: '禁用状态权限数' })
  inactive: number;

  @ApiProperty({ description: '按资源统计', type: [ResourceCount] })
  resources: ResourceCount[];
}
