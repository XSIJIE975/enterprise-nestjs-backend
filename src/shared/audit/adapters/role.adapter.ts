/**
 * Role 资源适配器
 * 用于审计日志中查询 Role 的旧数据
 * 支持单个和批量查询，特别支持 assignPermissions 场景的关联表查询
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { IResourceAdapter } from '@/shared/audit/interfaces/audit-log.interface';
import { AuditResource } from '@/common/constants/audit.constants';

@Injectable()
export class RoleAdapter implements IResourceAdapter {
  constructor(private readonly prisma: PrismaService) {}

  get resource() {
    return AuditResource.role;
  }

  /**
   * 根据ID查询单个Role
   * 包含基本信息和关联的权限ID
   * @param id 角色ID
   * @returns 角色对象（包含permissionIds），不存在返回 null
   */
  async findById(id: string | number): Promise<any> {
    const roleId = Number(id);

    // 查询角色基本信息
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!role) {
      return null;
    }

    // 查询角色关联的权限ID（直接从关联表查询，避免加载 Permission 对象）
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    const permissionIds = rolePermissions.map(rp => rp.permissionId);

    return {
      ...role,
      permissionIds,
    };
  }

  /**
   * 批量查询多个Role
   * @param ids 角色ID数组
   * @returns 角色对象数组（包含permissionIds）
   */
  async findByIds(ids: (string | number)[]): Promise<any[]> {
    if (ids.length === 0) {
      return [];
    }

    const numericIds = ids.map(id => Number(id));

    // 查询所有角色基本信息
    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: numericIds },
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 批量查询所有角色的权限（直接从关联表查询）
    const allRolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: numericIds },
      },
      select: {
        roleId: true,
        permissionId: true,
      },
    });

    // 构建权限映射（roleId -> permissionIds[]）
    const permissionMap = new Map<number, number[]>();
    allRolePermissions.forEach(rp => {
      if (!permissionMap.has(rp.roleId)) {
        permissionMap.set(rp.roleId, []);
      }
      permissionMap.get(rp.roleId)!.push(rp.permissionId);
    });

    // 为每个角色添加 permissionIds
    return roles.map(role => ({
      ...role,
      permissionIds: permissionMap.get(role.id) || [],
    }));
  }
}
