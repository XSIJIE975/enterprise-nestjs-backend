import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
  QueryPermissionsDto,
  PaginatedPermissionsDto,
} from './dto';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-codes.enum';

/**
 * 权限服务
 */
@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacCacheService: RbacCacheService,
  ) {}

  /**
   * 创建新权限
   * @param createPermissionDto 创建权限 DTO
   * @returns 权限信息
   */
  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    // 检查权限名称是否已存在
    const existingPermissionByName = await this.prisma.permission.findUnique({
      where: { name: createPermissionDto.name },
    });

    if (existingPermissionByName) {
      throw new BusinessException(
        ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
        '该权限名称已被使用',
      );
    }

    // 检查权限代码是否已存在
    const existingPermissionByCode = await this.prisma.permission.findUnique({
      where: { code: createPermissionDto.code },
    });

    if (existingPermissionByCode) {
      throw new BusinessException(
        ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
        '该权限代码已被使用',
      );
    }

    // 创建权限
    const permission = await this.prisma.permission.create({
      data: {
        name: createPermissionDto.name,
        code: createPermissionDto.code,
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
        description: createPermissionDto.description,
        isActive: true, // 默认启用
      },
    });

    return this.toPermissionResponse(permission);
  }

  /**
   * 查找所有权限
   * @returns 权限列表
   */
  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return permissions.map(permission => this.toPermissionResponse(permission));
  }

  /**
   * 根据 ID 查询单个权限
   * @param id 权限 ID
   * @returns 权限信息
   */
  async findOne(id: number): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new BusinessException(ErrorCode.PERMISSION_NOT_FOUND, '权限不存在');
    }

    return this.toPermissionResponse(permission);
  }

  /**
   * 根据代码查询权限
   * @param code 权限代码
   * @returns 权限信息
   */
  async findByCode(code: string) {
    return this.prisma.permission.findUnique({
      where: { code },
    });
  }

  /**
   * 更新权限信息
   * @param id 权限 ID
   * @param updatePermissionDto 更新权限 DTO
   * @returns 更新后的权限信息
   */
  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    // 检查权限是否存在
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new BusinessException(ErrorCode.PERMISSION_NOT_FOUND, '权限不存在');
    }

    // 如果更新权限名称，检查是否已被其他权限使用
    if (
      updatePermissionDto.name &&
      updatePermissionDto.name !== permission.name
    ) {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { name: updatePermissionDto.name },
      });

      if (existingPermission) {
        throw new BusinessException(
          ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
          '该权限名称已被使用',
        );
      }
    }

    // 如果更新权限代码，检查是否已被其他权限使用
    if (
      updatePermissionDto.code &&
      updatePermissionDto.code !== permission.code
    ) {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { code: updatePermissionDto.code },
      });

      if (existingPermission) {
        throw new BusinessException(
          ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
          '该权限代码已被使用',
        );
      }
    }

    // 更新权限
    const updatedPermission = await this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });

    // 清除 RBAC 缓存，确保权限变化后缓存更新
    await this.rbacCacheService.flushAllRbacCache();

    return this.toPermissionResponse(updatedPermission);
  }

  /**
   * 删除权限
   * @param id 权限 ID
   */
  async remove(id: number): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new BusinessException(ErrorCode.PERMISSION_NOT_FOUND, '权限不存在');
    }

    // 删除权限（硬删除，因为权限是系统核心数据）
    await this.prisma.permission.delete({
      where: { id },
    });

    // 清除 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();
  }

  /**
   * 分页查询权限列表
   * @param query 查询参数
   * @returns 分页权限列表
   */
  async findAllPaginated(
    query: QueryPermissionsDto,
  ): Promise<PaginatedPermissionsDto> {
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
  async updatePermissionStatus(
    id: number,
    isActive: boolean,
  ): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new BusinessException(ErrorCode.PERMISSION_NOT_FOUND, '权限不存在');
    }

    const updatedPermission = await this.prisma.permission.update({
      where: { id },
      data: { isActive },
    });

    // 清除 RBAC 缓存
    await this.rbacCacheService.flushAllRbacCache();

    return this.toPermissionResponse(updatedPermission);
  }

  /**
   * 获取权限统计数据
   * @returns 权限统计信息
   */
  async getPermissionStatistics(): Promise<any> {
    const [total, active, inactive, resources] = await Promise.all([
      // 权限总数
      this.prisma.permission.count(),
      // 激活权限数
      this.prisma.permission.count({
        where: { isActive: true },
      }),
      // 禁用权限数
      this.prisma.permission.count({
        where: { isActive: false },
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

    return {
      total,
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
  async batchDelete(ids: number[]): Promise<number> {
    // 检查权限是否存在
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: ids },
      },
    });

    if (permissions.length === 0) {
      throw new BusinessException(
        ErrorCode.PERMISSION_BATCH_DELETE_EMPTY,
        '没有找到可删除的权限',
      );
    }

    // 批量删除
    const result = await this.prisma.permission.deleteMany({
      where: {
        id: { in: ids },
      },
    });

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
  private toPermissionResponse(permission: any): PermissionResponseDto {
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
