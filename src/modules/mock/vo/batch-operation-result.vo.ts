import { ApiProperty } from '@nestjs/swagger';

/**
 * 批量操作结果 VO
 */
export class BatchOperationResultVo {
  @ApiProperty({
    description: '成功数量',
    example: 5,
  })
  success: number;

  @ApiProperty({
    description: '失败数量',
    example: 0,
  })
  failed: number;

  @ApiProperty({
    description: '失败的 ID 列表',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
    required: false,
  })
  failedIds?: string[];
}

/**
 * 导入配置结果 VO
 */
export class ImportConfigResultVo {
  @ApiProperty({
    description: '成功数量',
    example: 10,
  })
  success: number;

  @ApiProperty({
    description: '失败数量',
    example: 0,
  })
  failed: number;

  @ApiProperty({
    description: '跳过数量',
    example: 2,
  })
  skipped: number;

  @ApiProperty({
    description: '成功导入的端点 (path + method 组合)',
    example: ['GET /users', 'POST /users', 'GET /articles'],
    type: [String],
  })
  successEndpoints: string[];

  @ApiProperty({
    description: '跳过的端点 (path + method 组合)',
    example: ['GET /users/123'],
    type: [String],
    required: false,
  })
  skippedEndpoints?: string[];

  @ApiProperty({
    description: '失败的端点 (path + method 组合)',
    example: ['GET /invalid'],
    type: [String],
    required: false,
  })
  failedEndpoints?: string[];
}

/**
 * 删除结果 VO
 */
export class DeleteResultVo {
  @ApiProperty({
    description: '消息',
    example: '已删除',
  })
  message: string;
}

/**
 * 清除缓存结果 VO
 */
export class ClearCacheResultVo {
  @ApiProperty({
    description: '消息',
    example: '缓存已清除',
  })
  message: string;
}
