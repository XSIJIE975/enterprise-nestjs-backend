import { Global, Module, OnModuleInit } from '@nestjs/common';
import { LogsModule } from '@/modules/logs/logs.module';
import { RoleAdapter } from './adapters/role.adapter';
import { PermissionAdapter } from './adapters/permission.adapter';
import { UserAdapter } from './adapters/user.adapter';
import { AuditLogService } from './audit-log.service';
import { ResourceAdapterRegistry } from './resource-adapter.registry';

/**
 * 审计日志模块
 *
 * 提供完整的审计日志框架，包括：
 * - AuditLogService: 核心审计日志服务
 * - ResourceAdapterRegistry: 资源适配器注册表
 * - RoleAdapter, PermissionAdapter, UserAdapter: 资源适配器
 *
 * 标记为 @Global() 使得所有模块可以注入 AuditLogService
 *
 * @example
 * // 在任何服务中注入
 * constructor(private auditLogService: AuditLogService) {}
 *
 * // 使用装饰器在方法上添加审计
 * @AuditLog({ action: AuditAction.CREATE, resource: AuditResource.role })
 * create(data: CreateRoleDto) {
 *   // ...
 * }
 */
@Global()
@Module({
  imports: [LogsModule],
  providers: [
    // 核心服务
    AuditLogService,
    ResourceAdapterRegistry,

    // 资源适配器
    RoleAdapter,
    PermissionAdapter,
    UserAdapter,
  ],
  exports: [
    // 导出 AuditLogService 供其他模块使用
    AuditLogService,
  ],
})
export class AuditLogModule implements OnModuleInit {
  constructor(
    private readonly registry: ResourceAdapterRegistry,
    private readonly roleAdapter: RoleAdapter,
    private readonly permissionAdapter: PermissionAdapter,
    private readonly userAdapter: UserAdapter,
  ) {}

  /**
   * 模块初始化时自动注册所有资源适配器
   */
  onModuleInit() {
    this.registry.register(this.roleAdapter);
    this.registry.register(this.permissionAdapter);
    this.registry.register(this.userAdapter);
  }
}
