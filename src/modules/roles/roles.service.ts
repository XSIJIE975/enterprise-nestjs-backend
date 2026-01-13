import { Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { ErrorMessages } from '@/common/enums/error-codes.enum';
import { PrismaService } from '@/shared/database/prisma.service';
import { RbacCacheService } from '@/shared/cache';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRolesDto,
  AssignPermissionsDto,
} from './dto';
import { RoleResponseVo, RolePageVo, RoleStatisticsVo } from './vo';
import { PermissionResponseVo } from '../permissions/vo/permission-response.vo';

/**
 * 角色服务
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacCacheService: RbacCacheService,
  ) {}

  /**
   * 创建新角色
   * @param createRoleDto 创建角色 DTO
   * @returns 角色信息
   */
  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseVo> {
    // 检查角色名称是否已存在
    const existingRoleByName = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRoleByName) {
      throw new BusinessException(
        ErrorCode.ROLE_NAME_ALREADY_EXISTS,
        ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
      );
    }

    // 检查角色代码是否已存在
    const existingRoleByCode = await this.prisma.role.findUnique({
      where: { code: createRoleDto.code },
    });

    if (existingRoleByCode) {
      throw new BusinessException(
        ErrorCode.ROLE_CODE_ALREADY_EXISTS,
        ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
      );
    }

    // 创建角色
    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        code: createRoleDto.code,
        description: createRoleDto.description,
        isActive: true,
      },
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return this.mapToResponseDto(role);
  }

  /**
   * 查询所有角色（基础列表）
   * @returns 角色列表
   */
  async findAll(): Promise<RoleResponseVo[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return roles.map(role => this.mapToResponseDto(role));
  }

  /**
   * 根据ID查询角色
   * @param id 角色ID
   * @param includePermissions 是否包含权限信息
   * @returns 角色信息
   */
  async findOne(
    id: number,
    includePermissions: boolean = false,
  ): Promise<RoleResponseVo> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: includePermissions
        ? {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          }
        : undefined,
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    return this.mapToResponseDto(role, includePermissions);
  }

  /**
   * 根据代码查询角色
   * @param code 角色代码
   * @returns 角色信息
   */
  async findByCode(code: string): Promise<RoleResponseVo> {
    const role = await this.prisma.role.findUnique({
      where: { code },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    return this.mapToResponseDto(role);
  }

  /**
   * 分页查询角色
   * @param query 查询参数
   * @returns 分页角色列表
   */
  async findAllPaginated(query: QueryRolesDto): Promise<RolePageVo> {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 构建排序条件
    const orderBy: any = {};
    orderBy[sortBy] = order;

    // 查询总数
    const total = await this.prisma.role.count({ where });

    // 查询数据
    const roles = await this.prisma.role.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: roles.map(role => this.mapToResponseDto(role)),
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * 更新角色
   * @param id 角色ID
   * @param updateRoleDto 更新角色 DTO
   * @returns 更新后的角色信息
   */
  async update(
    id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseVo> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 如果更新角色名称，检查是否已被其他角色使用
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        throw new BusinessException(
          ErrorCode.ROLE_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
        );
      }
    }

    // 如果更新角色代码，检查是否已被其他角色使用
    if (updateRoleDto.code && updateRoleDto.code !== role.code) {
      const existingRole = await this.prisma.role.findUnique({
        where: { code: updateRoleDto.code },
      });

      if (existingRole) {
        throw new BusinessException(
          ErrorCode.ROLE_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
        );
      }
    }

    // 更新角色
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return this.mapToResponseDto(updatedRole);
  }

  /**
   * 删除角色
   * @param id 角色ID
   */
  async remove(id: number): Promise<void> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 检查角色是否被用户使用
    const userRoleCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (userRoleCount > 0) {
      throw new BusinessException(
        ErrorCode.ROLE_IN_USE,
        ErrorMessages[ErrorCode.ROLE_IN_USE],
      );
    }

    // 删除角色（级联删除角色权限关联）
    await this.prisma.role.delete({
      where: { id },
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();
  }

  /**
   * 更新角色状态
   * @param id 角色ID
   * @param isActive 角色状态
   * @returns 更新后的角色信息
   */
  async updateRoleStatus(
    id: number,
    isActive: boolean,
  ): Promise<RoleResponseVo> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 更新角色状态
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: { isActive },
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return this.mapToResponseDto(updatedRole);
  }

  /**
   * 为角色分配权限
   * @param roleId 角色ID
   * @param assignPermissionsDto 分配权限 DTO
   * @returns 更新后的角色信息（包含权限）
   */
  async assignPermissions(
    roleId: number,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleResponseVo> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 检查权限是否存在
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: assignPermissionsDto.permissionIds },
        isActive: true,
      },
    });

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BusinessException(
        ErrorCode.PERMISSION_NOT_FOUND,
        ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
      );
    }

    // 删除现有的角色权限关联
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // 创建新的角色权限关联
    const rolePermissions = assignPermissionsDto.permissionIds.map(
      permissionId => ({
        roleId,
        permissionId,
      }),
    );

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    // 返回包含权限的角色信息
    return this.findOne(roleId, true);
  }

  /**
   * 获取角色的权限列表
   * @param roleId 角色ID
   * @returns 权限列表
   */
  async getRolePermissions(roleId: number): Promise<PermissionResponseVo[]> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map(
      rp => rp.permission as unknown as PermissionResponseVo,
    );
  }

  /**
   * 获取角色统计信息
   * @returns 角色统计信息
   */
  async getRoleStatistics(): Promise<RoleStatisticsVo> {
    const [total, active, inactive] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.role.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

  /**
   * 批量删除角色
   * @param ids 角色ID列表
   * @returns 删除的角色数量
   */
  async batchDelete(ids: number[]): Promise<number> {
    // 检查角色是否存在且未被使用
    const roles = await this.prisma.role.findMany({
      where: { id: { in: ids } },
      include: {
        userRoles: true,
      },
    });

    if (roles.length !== ids.length) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 检查是否有角色被用户使用
    const usedRoles = roles.filter(role => role.userRoles.length > 0);
    if (usedRoles.length > 0) {
      throw new BusinessException(
        ErrorCode.ROLE_IN_USE,
        ErrorMessages[ErrorCode.ROLE_IN_USE],
      );
    }

    // 批量删除角色
    const result = await this.prisma.role.deleteMany({
      where: { id: { in: ids } },
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return result.count;
  }

  /**
   * 获取所有激活角色的代码列表
   * @returns 角色代码列表
   */
  async getAllActiveRoleCodes(): Promise<string[]> {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      select: { code: true },
    });

    return roles.map(role => role.code);
  }

  /**
   * 将数据库角色对象映射为响应 DTO
   * @param role 数据库角色对象
   * @param includePermissions 是否包含权限信息
   * @returns 角色响应 DTO
   */
  private mapToResponseDto(
    role: any,
    includePermissions: boolean = false,
  ): RoleResponseVo {
    const response: RoleResponseVo = {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    if (includePermissions && role.rolePermissions) {
      response.permissions = role.rolePermissions.map(
        (rp: any) => rp.permission,
      );
    }

    return response;
  }
}
