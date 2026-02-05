/**
 * 资源适配器注册表
 * 管理不同资源类型的适配器实例
 * 提供统一的适配器查询接口
 */

import { Injectable } from '@nestjs/common';
import { AuditResource } from '@/common/constants/audit.constants';
import { IResourceAdapter } from './interfaces/audit-log.interface';

/**
 * 资源适配器注册表
 * 存储和管理各种资源类型的适配器
 *
 * @example
 * const registry = new ResourceAdapterRegistry();
 * registry.register(userAdapter);
 * registry.register(roleAdapter);
 * const adapter = registry.getAdapter(AuditResource.user);
 */
@Injectable()
export class ResourceAdapterRegistry {
  /**
   * 适配器存储映射表
   * Key: 资源类型 (AuditResource)
   * Value: 该资源类型对应的适配器实例
   */
  private adapters = new Map<AuditResource, IResourceAdapter>();

  /**
   * 注册资源适配器
   *
   * @param adapter 资源适配器实例
   * @throws 如果同一资源类型已注册，会被新适配器覆盖（覆盖而非错误）
   *
   * @example
   * registry.register(userAdapter);
   * registry.register(roleAdapter);
   */
  register(adapter: IResourceAdapter): void {
    this.adapters.set(adapter.resource, adapter);
  }

  /**
   * 获取指定资源类型的适配器
   *
   * @param resource 资源类型
   * @returns 资源适配器实例
   * @throws {Error} 如果未找到该资源类型的适配器，抛出错误
   *
   * @example
   * const adapter = registry.getAdapter(AuditResource.user);
   * const resource = await adapter.findById('123');
   */
  getAdapter(resource: AuditResource): IResourceAdapter {
    const adapter = this.adapters.get(resource);
    if (!adapter) {
      throw new Error(`No adapter registered for resource: ${resource}`);
    }
    return adapter;
  }
}
