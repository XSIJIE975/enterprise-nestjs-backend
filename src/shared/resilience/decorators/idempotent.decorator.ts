import { SetMetadata } from '@nestjs/common';

/**
 * 幂等操作标记装饰器
 * 用于标记可以安全重试的幂等方法
 */

// 元数据键
export const IDEMPOTENT_KEY = 'idempotent';

/**
 * 标记方法为幂等操作
 * 只有标记为幂等的方法才能应用 @Retryable() 装饰器
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository {
 *   @Idempotent()
 *   @Retryable()
 *   async findById(id: string) {
 *     return this.prisma.user.findUnique({ where: { id } });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   // 读操作是幂等的
 *   @Idempotent()
 *   @Retryable()
 *   async getUser(id: string) {
 *     return this.userRepository.findById(id);
 *   }
 *
 *   // 写操作未标记 @Idempotent()，不会重试
 *   async createUser(data: CreateUserDto) {
 *     return this.userRepository.create(data);
 *   }
 * }
 * ```
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
