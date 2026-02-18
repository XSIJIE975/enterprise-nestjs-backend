/**
 * Permission 资源适配器
 * 用于审计日志中查询 Permission 的旧数据
 */

import { Injectable } from '@nestjs/common';
import { AuditResource } from '@/common/constants/audit.constants';
import { PrismaService } from '@/shared/database/prisma.service';
import { IResourceAdapter } from '@/shared/audit/interfaces/audit-log.interface';

@Injectable()
export class PermissionAdapter implements IResourceAdapter {
  constructor(private readonly prisma: PrismaService) {}

  get resource() {
    return AuditResource.permission;
  }

  /**
   * 根据ID查询单个Permission
   * @param id 权限ID
   * @returns 权限对象，不存在返回 null
   */
  async findById(id: string | number): Promise<any> {
    const permission = await this.prisma.permission.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        resource: true,
        action: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return permission || null;
  }

  /**
   * 批量查询多个Permission
   * @param ids 权限ID数组
   * @returns 权限对象数组
   */
  async findByIds(ids: (string | number)[]): Promise<any[]> {
    if (ids.length === 0) {
      return [];
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: ids.map(id => Number(id)) },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        resource: true,
        action: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return permissions;
  }
}
