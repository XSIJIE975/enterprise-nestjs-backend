import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  RoleModel,
  RolePermissionModel,
  PermissionModel,
} from '@/generated/prisma/models';
import { PermissionResponseVo } from '@/modules/permissions/vo';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { ErrorMessages } from '@/common/enums/error-codes.enum';
import { AuditLog } from '@/common/decorators/audit-log.decorator';
import { AuditAction, AuditResource } from '@/common/constants/audit.constants';
import { PrismaService } from '@/shared/database/prisma.service';
import { RbacCacheService } from '@/shared/cache';
import { RoleRepository } from '@/shared/repositories/role.repository';
import { AuditLogService } from '@/shared/audit/audit-log.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRolesDto,
  AssignPermissionsDto,
} from './dto';
import { RoleResponseVo, RolePageVo, RoleStatisticsVo } from './vo';

/**
 * 角色服务
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacCacheService: RbacCacheService,
    private readonly roleRepository: RoleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 创建新角色
   * @param createRoleDto 创建角色 DTO
   * @returns 角色信息
   */
  @AuditLog({
    action: AuditAction.CREATE,
    resource: AuditResource.role,
    resourceIdFromResult: 'id',
  })
  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseVo> {
    try {
      // 使用 Repository 创建角色
      const role = await this.roleRepository.create({
        name: createRoleDto.name,
        code: createRoleDto.code,
        description: createRoleDto.description,
        isActive: true,
      });

      // 清理 RBAC 缓存
      await this.rbacCacheService.flushAllRbacCache();

      return this.mapToResponseDto(role);
    } catch (error) {
      // 捕获 Repository 抛出的 ConflictException 并转换为 BusinessException
      if (error instanceof ConflictException) {
        const message = (error.getResponse() as any)?.message || '';
        if (message.includes('代码')) {
          throw new BusinessException(
            ErrorCode.ROLE_CODE_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
          );
        }
        if (message.includes('名称')) {
          throw new BusinessException(
            ErrorCode.ROLE_NAME_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
          );
        }
        // 默认转换为 BusinessException
        throw new BusinessException(
          ErrorCode.ROLE_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
        );
      }
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('name')) {
            throw new BusinessException(
              ErrorCode.ROLE_NAME_ALREADY_EXISTS,
              ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
            );
          }
          if (target?.includes('code')) {
            throw new BusinessException(
              ErrorCode.ROLE_CODE_ALREADY_EXISTS,
              ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
            );
          }
        }
      }
      throw error;
    }
  }

  /**
   * 查询所有角色（基础列表）
   * @returns 角色列表
   */
  async findAll(): Promise<RoleResponseVo[]> {
    const roles = await this.roleRepository.findAll();

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
    const role = await this.roleRepository.findById(id);

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
    const role = await this.roleRepository.findByCode(code);

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
  @AuditLog({
    action: AuditAction.UPDATE,
    resource: AuditResource.role,
    resourceIdArg: 0,
  })
  async update(
    id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseVo> {
    // 检查角色是否存在，保存原数据以用于审计日志
    const existingRole = await this.roleRepository.findById(id);

    if (!existingRole) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    try {
      // 使用 Repository 更新
      const updatedRole = await this.roleRepository.update(id, updateRoleDto);

      // 清理 RBAC 缓存
      await this.rbacCacheService.flushAllRbacCache();

      return this.mapToResponseDto(updatedRole);
    } catch (error) {
      // 捕获 Repository 抛出的 ConflictException 并转换为 BusinessException
      if (error instanceof ConflictException) {
        const message = (error.getResponse() as any)?.message || '';
        if (message.includes('代码')) {
          throw new BusinessException(
            ErrorCode.ROLE_CODE_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
          );
        }
        if (message.includes('名称')) {
          throw new BusinessException(
            ErrorCode.ROLE_NAME_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
          );
        }
        // 默认转换为 BusinessException
        throw new BusinessException(
          ErrorCode.ROLE_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
        );
      }
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('name')) {
            throw new BusinessException(
              ErrorCode.ROLE_NAME_ALREADY_EXISTS,
              ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
            );
          }
          if (target?.includes('code')) {
            throw new BusinessException(
              ErrorCode.ROLE_CODE_ALREADY_EXISTS,
              ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
            );
          }
        }
      }
      throw error;
    }
  }

  /**
   * 删除角色
   * @param id 角色ID
   */
  @AuditLog({
    action: AuditAction.DELETE,
    resource: AuditResource.role,
    resourceIdArg: 0,
  })
  async remove(id: number): Promise<void> {
    // 先查询角色完整信息用于审计日志
    const roleToDelete = await this.roleRepository.findById(id);

    if (!roleToDelete) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    await this.prisma.$transaction(async tx => {
      // 检查角色是否存在
      const role = await tx.role.findUnique({
        where: { id },
      });

      if (!role) {
        throw new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        );
      }

      // 检查角色是否被用户使用
      const userRoleCount = await tx.userRole.count({
        where: { roleId: id },
      });

      if (userRoleCount > 0) {
        throw new BusinessException(
          ErrorCode.ROLE_IN_USE,
          ErrorMessages[ErrorCode.ROLE_IN_USE],
        );
      }

      // 使用 Repository 删除角色（级联删除角色权限关联）
      await this.roleRepository.delete(id, tx);
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
  @AuditLog({
    action: AuditAction.UPDATE_STATUS,
    resource: AuditResource.role,
    resourceIdArg: 0,
  })
  async updateRoleStatus(
    id: number,
    isActive: boolean,
  ): Promise<RoleResponseVo> {
    // 检查角色是否存在，保存原数据以用于审计日志
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 使用 Repository 更新角色状态
    const updatedRole = await this.roleRepository.update(id, { isActive });

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
  @AuditLog({
    action: AuditAction.ASSIGN_PERMISSIONS,
    resource: AuditResource.role,
    resourceIdArg: 0,
  })
  async assignPermissions(
    roleId: number,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleResponseVo> {
    // 检查角色是否存在
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    // 检查权限是否存在
    const uniquePermissionIds = [
      ...new Set(assignPermissionsDto.permissionIds),
    ];
    const permissionCount = await this.prisma.permission.count({
      where: {
        id: { in: uniquePermissionIds },
        isActive: true,
      },
    });

    if (permissionCount !== uniquePermissionIds.length) {
      throw new BusinessException(
        ErrorCode.PERMISSION_NOT_FOUND,
        ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
      );
    }

    // 使用事务确保原子性执行
    await this.prisma.$transaction(async tx => {
      // 1. 删除现有的角色权限关联
      await this.roleRepository.removePermissions(
        roleId,
        uniquePermissionIds,
        tx,
      );

      // 2. 创建新的角色权限关联
      if (uniquePermissionIds.length > 0) {
        await this.roleRepository.assignPermissions(
          roleId,
          uniquePermissionIds,
          tx,
        );
      }
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
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new BusinessException(
        ErrorCode.ROLE_NOT_FOUND,
        ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
      );
    }

    const rolePermissions =
      await this.roleRepository.findRolePermissions(roleId);

    // 获取权限详情
    const permissionIds = rolePermissions.map(rp => rp.permissionId);
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    return permissions as unknown as PermissionResponseVo[];
  }

  /**
   * 获取角色统计信息
   * @returns 角色统计信息
   */
  async getRoleStatistics(): Promise<RoleStatisticsVo> {
    const statusCounts = await this.prisma.role.groupBy({
      by: ['isActive'],
      _count: true,
    });

    let active = 0;
    let inactive = 0;

    statusCounts.forEach(item => {
      if (item.isActive) {
        active = item._count;
      } else {
        inactive = item._count;
      }
    });

    return {
      total: active + inactive,
      active,
      inactive,
    };
  }

  /**
   * 批量删除角色
   * @param ids 角色ID列表
   * @returns 删除的角色数量
   */
  @AuditLog({
    action: AuditAction.BATCH_DELETE,
    resource: AuditResource.role,
    resourceIdArg: 0,
    batch: true,
  })
  async batchDelete(ids: number[]): Promise<number> {
    const uniqueIds = [...new Set(ids)];

    const count = await this.prisma.$transaction(async tx => {
      // 检查角色是否存在且未被使用
      const roles = await tx.role.findMany({
        where: { id: { in: uniqueIds } },
        include: {
          userRoles: true,
        },
      });

      if (roles.length !== uniqueIds.length) {
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

      // 使用 Repository 批量删除角色
      const result = await tx.role.deleteMany({
        where: { id: { in: uniqueIds } },
      });

      return result.count;
    });

    // 清理 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return count;
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
    role: RoleModel & {
      rolePermissions?: (RolePermissionModel & {
        permission: PermissionModel;
      })[];
    },
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
      response.permissions = role.rolePermissions.map(rp => rp.permission);
    }

    return response;
  }
}
