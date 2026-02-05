/**
 * 审计常量定义
 * 用于记录系统中的关键操作日志
 */

/**
 * 审计操作类型枚举
 */
export enum AuditAction {
  // 基础操作
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  UPDATE_STATUS = 'UPDATE_STATUS',
  DELETE = 'DELETE',
  BATCH_DELETE = 'BATCH_DELETE',

  // RBAC 权限操作
  ASSIGN_PERMISSIONS = 'ASSIGN_PERMISSIONS',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  REMOVE_ROLE = 'REMOVE_ROLE',

  // 用户操作
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  VERIFY_USER = 'VERIFY_USER',
  CREATE_USER = 'CREATE_USER',
}

/**
 * 审计资源类型枚举
 */
export enum AuditResource {
  role = 'role',
  permission = 'permission',
  user = 'user',
}
