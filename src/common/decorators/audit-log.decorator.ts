/**
 * 审计日志装饰器
 * 用于自动记录 Service 方法的审计日志
 *
 * 使用 Property Injection 模式：
 * - 装饰器通过 this.auditLogService 访问审计服务
 * - Service 需要注入 AuditLogService
 */

import { IAuditLogOptions } from '@/shared/audit/interfaces/audit-log.interface';

/**
 * 审计日志方法装饰器
 *
 * @param options 审计日志配置选项
 * @returns 方法装饰器
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class RolesService {
 *   constructor(private readonly auditLogService: AuditLogService) {}
 *
 *   @AuditLog({
 *     action: AuditAction.CREATE,
 *     resource: AuditResource.role,
 *     resourceIdFromResult: 'id'
 *   })
 *   async create(dto: CreateRoleDto) {
 *     return this.roleRepository.create(dto);
 *   }
 * }
 * ```
 */
export function AuditLog(options: IAuditLogOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 尝试访问 auditLogService（Property Injection 模式）
      const auditService = (this as any).auditLogService;

      // 如果服务不存在，降级为无审计模式（优雅降级）
      if (!auditService) {
        console.warn(
          `[AuditLog] AuditLogService not injected in ${target.constructor.name}.${propertyKey}. ` +
            'Audit logging will be skipped. Please inject AuditLogService in constructor.',
        );
        return originalMethod.apply(this, args);
      }

      // 委托给 AuditLogService 执行，让异常自然传播
      return await auditService.execute(options, originalMethod, args, this);
    };

    return descriptor;
  };
}
