import { ApiProperty } from '@nestjs/swagger';
import { MockEndpointVo } from './mock-endpoint.vo';

/**
 * Mock 端点分页列表响应 VO
 */
export class MockEndpointListVo {
  @ApiProperty({
    description: '数据列表',
    type: [MockEndpointVo],
  })
  items!: MockEndpointVo[];

  @ApiProperty({
    description: '总数',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: '每页数量',
    example: 20,
  })
  pageSize!: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  totalPages!: number;
}
