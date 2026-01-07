import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaVo } from './pagination-meta.dto';

/**
 * 通用分页响应 VO 基类
 * 使用泛型 T 来支持任何数据类型
 *
 * 注意：子类需要使用 @ApiProperty 重新声明 data 属性来指定具体的类型
 *
 * @example
 * export class UserPageVo extends PaginatedVo<UserVo> {
 *   @ApiProperty({ type: [UserVo], description: '用户列表' })
 *   declare data: UserVo[];
 * }
 */
export class PaginatedVo<T> {
  /**
   * 数据列表
   * 子类应该使用 @ApiProperty 装饰器重新声明此属性以指定具体类型
   */
  data: T[];

  @ApiProperty({
    description: '分页元数据',
    type: PaginationMetaVo,
  })
  meta: PaginationMetaVo;
}
