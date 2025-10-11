import { SetMetadata } from '@nestjs/common';

/**
 * 权限装饰器的元数据键
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限逻辑类型
 */
export enum PermissionLogic {
  AND = 'AND', // 需要拥有所有权限
  OR = 'OR', // 需要拥有任意一个权限
}

/**
 * 权限装饰器选项
 */
export interface PermissionsOptions {
  permissions: string[];
  logic?: PermissionLogic;
}

/**
 * 权限装饰器
 * 用于标记路由需要的权限
 *
 * @param permissions 权限代码数组
 * @param logic 权限逻辑（AND/OR），默认为 AND
 *
 * @example
 * ```typescript
 * // 需要拥有用户读取权限
 * @Permissions('user:read')
 * @Get('users')
 * getUsers() { }
 *
 * // 需要同时拥有用户读取和写入权限
 * @Permissions('user:read', 'user:write')
 * @Patch('users/:id')
 * updateUser() { }
 *
 * // 拥有任意一个权限即可（OR 逻辑）
 * @PermissionsOr('user:read', 'user:write')
 * @Get('users/:id')
 * getUser() { }
 * ```
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, {
    permissions,
    logic: PermissionLogic.AND,
  } as PermissionsOptions);

/**
 * 权限装饰器（OR 逻辑）
 * 用户只需拥有任意一个权限即可访问
 *
 * @param permissions 权限代码数组
 */
export const PermissionsOr = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, {
    permissions,
    logic: PermissionLogic.OR,
  } as PermissionsOptions);
