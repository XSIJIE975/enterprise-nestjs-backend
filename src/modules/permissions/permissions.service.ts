import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PermissionModel } from '@/prisma/prisma/models';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { ErrorMessages } from '@/common/enums/error-codes.enum';
import { PrismaService } from '@/shared/database/prisma.service';
import { RbacCacheService } from '@/shared/cache';
import { PermissionRepository } from '@/shared/repositories/permission.repository';
import { AuditAction, AuditResource } from '@/common/constants/audit.constants';
import { AuditLog } from '@/common/decorators/audit-log.decorator';
import { AuditLogService } from '@/shared/audit/audit-log.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  QueryPermissionsDto,
} from './dto';
import {
  PermissionResponseVo,
  PermissionPageVo,
  PermissionStatisticsVo,
} from './vo';

/**
 * 权限服务
 */
@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacCacheService: RbacCacheService,
    private readonly permissionRepository: PermissionRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 创建新权限
   * @param createPermissionDto 创建权限 DTO
   * @returns 权限信息
   */
  @AuditLog({
    action: AuditAction.CREATE,
    resource: AuditResource.permission,
    resourceIdFromResult: 'id',
  })
  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseVo> {
    try {
      // 使用 Repository 创建权限
      const permission = await this.permissionRepository.create({
        name: createPermissionDto.name,
        code: createPermissionDto.code,
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
        description: createPermissionDto.description,
        isActive: true,
      });

      return this.toPermissionResponse(permission);
    } catch (error) {
      // 捕获 Repository 抛出的 ConflictException 并转换为 BusinessException
      if (error instanceof ConflictException) {
        const message = (error.getResponse() as any)?.message || '';
        if (message.includes('代码')) {
          throw new BusinessException(
            ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
          );
        }
        if (message.includes('名称')) {
          throw new BusinessException(
            ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.PERMISSION_NAME_ALREADY_EXISTS],
          );
        }
        // 默认转换
        throw new BusinessException(
          ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
        );
      }
      throw error;
    }
  }

  /**
   * 查找所有权限
   * @returns 权限列表
   */
  async findAll(): Promise<PermissionResponseVo[]> {
    const permissions = await this.permissionRepository.findAll();

    return permissions.map(permission => this.toPermissionResponse(permission));
  }

  /**
   * 根据 ID 查询单个权限
   * @param id 权限 ID
   * @returns 权限信息
   */
  async findOne(id: number): Promise<PermissionResponseVo> {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new BusinessException(
        ErrorCode.PERMISSION_NOT_FOUND,
        ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
      );
    }

    return this.toPermissionResponse(permission);
  }

  /**
   * 根据代码查询权限
   * @param code 权限代码
   * @returns 权限信息
   */
  async findByCode(code: string) {
    return this.permissionRepository.findByCode(code);
  }

  /**
   * 更新权限信息
   * @param id 权限 ID
   * @param updatePermissionDto 更新权限 DTO
   * @returns 更新后的权限信息
   */
  @AuditLog({
    action: AuditAction.UPDATE,
    resource: AuditResource.permission,
    resourceIdArg: 0,
  })
  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseVo> {
    try {
      // 查询原数据（在更新之前）
      const oldPermission = await this.permissionRepository.findById(id);
      if (!oldPermission) {
        throw new NotFoundException('Permission not found');
      }

      // 使用 Repository 更新权限
      const updatedPermission = await this.permissionRepository.update(
        id,
        updatePermissionDto,
      );

      // 清除 RBAC 缓存，确保权限变化后缓存更新
      await this.rbacCacheService.flushAllRbacCache();

      return this.toPermissionResponse(updatedPermission);
    } catch (error) {
      // 捕获 Repository 抛出的异常并转换为 BusinessException
      if (error instanceof ConflictException) {
        const message = (error.getResponse() as any)?.message || '';
        if (message.includes('代码')) {
          throw new BusinessException(
            ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
          );
        }
        if (message.includes('名称')) {
          throw new BusinessException(
            ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
            ErrorMessages[ErrorCode.PERMISSION_NAME_ALREADY_EXISTS],
          );
        }
      }
      if (error instanceof NotFoundException) {
        throw new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        );
      }
      throw error;
    }
  }

  /**
   * 删除权限
   * @param id 权限 ID
   */
  @AuditLog({
    action: AuditAction.DELETE,
    resource: AuditResource.permission,
    resourceIdArg: 0,
  })
  async remove(id: number): Promise<void> {
    try {
      // 查询原数据（在删除之前）
      const oldPermission = await this.permissionRepository.findById(id);
      if (!oldPermission) {
        throw new NotFoundException('Permission not found');
      }

      // 使用 Repository 删除权限
      await this.permissionRepository.delete(id);

      // 清除 RBAC 缓存
      await this.rbacCacheService.flushAllRbacCache();
    } catch (error) {
      // 捕获 Repository 抛出的 NotFoundException 并转换为 BusinessException
      if (error instanceof NotFoundException) {
        throw new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        );
      }
      throw error;
    }
  }

  /**
   * 分页查询权限列表
   * @param query 查询参数
   * @returns 分页权限列表
   */
  async findAllPaginated(
    query: QueryPermissionsDto,
  ): Promise<PermissionPageVo> {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      resource,
      action,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: any = {};

    // 关键词搜索（权限名称、代码、描述）
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    // 资源类型筛选
    if (resource) {
      where.resource = resource;
    }

    // 操作动作筛选
    if (action) {
      where.action = action;
    }

    // 状态筛选
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 查询总数和数据
    const [total, permissions] = await Promise.all([
      this.prisma.permission.count({ where }),
      this.prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: order,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: permissions.map(permission =>
        this.toPermissionResponse(permission),
      ),
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
   * 更新权限状态
   * @param id 权限 ID
   * @param isActive 是否激活
   * @returns 更新后的权限信息
   */
  @AuditLog({
    action: AuditAction.UPDATE_STATUS,
    resource: AuditResource.permission,
    resourceIdArg: 0,
  })
  async updatePermissionStatus(
    id: number,
    isActive: boolean,
  ): Promise<PermissionResponseVo> {
    try {
      // 查询原数据（在更新之前）
      const oldPermission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!oldPermission) {
        throw new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        );
      }

      const updatedPermission = await this.prisma.permission.update({
        where: { id },
        data: { isActive },
      });

      // 清除 RBAC 缓存
      await this.rbacCacheService.flushAllRbacCache();

      return this.toPermissionResponse(updatedPermission);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        );
      }
      throw error;
    }
  }

  /**
   * 获取权限统计数据
   * @returns 权限统计信息
   */
  async getPermissionStatistics(): Promise<PermissionStatisticsVo> {
    const [statusCounts, resources] = await Promise.all([
      // 按状态分组统计（获取总数、激活数、禁用数）
      this.prisma.permission.groupBy({
        by: ['isActive'],
        _count: {
          id: true,
        },
      }),
      // 按资源分组统计
      this.prisma.permission.groupBy({
        by: ['resource'],
        _count: {
          id: true,
        },
        where: { isActive: true },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
    ]);

    let active = 0;
    let inactive = 0;

    statusCounts.forEach(item => {
      if (item.isActive) {
        active = item._count.id;
      } else {
        inactive = item._count.id;
      }
    });

    return {
      total: active + inactive,
      active,
      inactive,
      resources: resources.map(r => ({
        resource: r.resource,
        count: r._count.id,
      })),
    };
  }

  /**
   * 批量删除权限
   * @param ids 权限 ID 数组
   * @returns 删除的权限数量
   */
  @AuditLog({
    action: AuditAction.BATCH_DELETE,
    resource: AuditResource.permission,
    resourceIdArg: 0,
    batch: true,
  })
  async batchDelete(ids: number[]): Promise<number> {
    const uniqueIds = [...new Set(ids)];

    // 批量删除
    const result = await this.prisma.permission.deleteMany({
      where: {
        id: { in: uniqueIds },
      },
    });

    if (result.count === 0) {
      throw new BusinessException(
        ErrorCode.PERMISSION_BATCH_DELETE_EMPTY,
        ErrorMessages[ErrorCode.PERMISSION_BATCH_DELETE_EMPTY],
      );
    }

    // 清除 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return result.count;
  }

  /**
   * 获取所有激活的权限代码列表
   * @returns 权限代码数组
   */
  async getAllActivePermissionCodes(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      select: { code: true },
    });

    return permissions.map(p => p.code);
  }

  /**
   * 将权限实体转换为响应 DTO
   * @param permission 权限实体
   * @returns 权限响应 DTO
   */
  private toPermissionResponse(
    permission: PermissionModel,
  ): PermissionResponseVo {
    return {
      id: permission.id,
      name: permission.name,
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      isActive: permission.isActive,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
