/**
 * User 资源适配器
 * 用于审计日志中查询 User 的旧数据
 * 支持基本信息查询和关联的角色ID查询（用于 assignRoles 场景）
 * 注意：绝对不要包含敏感字段如 password, refreshToken
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { IResourceAdapter } from '@/shared/audit/interfaces/audit-log.interface';
import { AuditResource } from '@/common/constants/audit.constants';

@Injectable()
export class UserAdapter implements IResourceAdapter {
  constructor(private readonly prisma: PrismaService) {}

  get resource() {
    return AuditResource.user;
  }

  /**
   * 根据ID查询单个User
   * 包含基本信息和关联的角色ID
   * 敏感字段（password, refreshToken）被排除
   * @param id 用户ID (UUID 字符串)
   * @returns 用户对象，不存在返回 null
   */
  async findById(id: string | number): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        // ⚠️ 绝对不要包含 password 或 refreshToken
        userRoles: {
          select: {
            role: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // 提取角色ID（用于 assignRoles 场景）
    const roleIds = user.userRoles.map(ur => ur.role.id);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roleIds, // 额外字段，用于 assignRoles oldData
    };
  }

  /**
   * 批量查询多个User
   * @param ids 用户ID数组
   * @returns 用户对象数组
   */
  async findByIds(ids: (string | number)[]): Promise<any[]> {
    if (ids.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: ids.map(id => String(id)) },
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        // ⚠️ 绝对不要包含 password 或 refreshToken
        userRoles: {
          select: {
            role: {
              select: { id: true },
            },
          },
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      isVerified: user.isVerified,
      roleIds: user.userRoles.map(ur => ur.role.id),
    }));
  }
}
