import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器的元数据键
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器
 * 用于标记路由需要的角色权限
 *
 * @param roles 角色代码数组，支持多个角色（OR 逻辑）
 *
 * @example
 * ```typescript
 * // 仅管理员可访问
 * @Roles('admin')
 * @Get('admin/users')
 * getUsers() { }
 *
 * // 管理员或编辑可访问
 * @Roles('admin', 'editor')
 * @Get('content/edit')
 * editContent() { }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
