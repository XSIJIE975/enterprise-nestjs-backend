import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { MockCacheService } from './mock-cache.service';
import { MockLoggerService } from './mock-logger.service';
import { PathMatcher } from '../utils/path-matcher.util';
import { JsonUtil } from '@/common/utils/json.util';
import type { CreateMockEndpointDto } from '../dto/create-mock-endpoint.dto';
import type { UpdateMockEndpointDto } from '../dto/update-mock-endpoint.dto';
import type { MockLogCreateDto } from '../dto/log-mock.dto';
import type { IMockEndpoint } from '../interfaces/mock-endpoint.interface';
import { OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@/shared/logger/logger.service';

@Injectable()
export class MockService implements OnModuleInit {
  private readonly ALL_KEY = 'mock:endpoints:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MockCacheService,
    private readonly mockLogger: MockLoggerService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 模块初始化时预加载所有启用的 Mock 端点
   */
  async onModuleInit() {
    try {
      const enabledEndpoints = await this.prisma.mockEndpoint.findMany({
        where: { enabled: true },
      });

      if (enabledEndpoints.length === 0) {
        this.logger.log('📦 未发现启用的 Mock 端点，跳过预加载', 'MockService');
        return;
      }

      // 反序列化并缓存到列表缓存
      const deserializedEndpoints = enabledEndpoints.map(
        r =>
          JsonUtil.deserializeFields(r, [
            'headers',
            'validation',
          ]) as IMockEndpoint,
      );

      // 缓存整个列表
      await this.cacheService.set(this.ALL_KEY, deserializedEndpoints, 60);

      this.logger.log(
        `✅ 成功预加载 ${enabledEndpoints.length} 个启用的 Mock 端点到缓存`,
        'MockService',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ 预加载 Mock 端点失败: ${errorMessage}`,
        errorStack,
        'MockService',
      );
    }
  }

  async list(): Promise<IMockEndpoint[]> {
    // simple list from DB
    const rows = await this.prisma.mockEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // deserialize JSON-like fields stored as TEXT
    return rows.map(
      r =>
        JsonUtil.deserializeFields(r, [
          'headers',
          'validation',
        ]) as IMockEndpoint,
    );
  }

  async create(dto: CreateMockEndpointDto): Promise<IMockEndpoint> {
    // serialize JSON fields to string for TEXT columns
    const toSave = { ...dto };
    if (dto.headers && typeof dto.headers !== 'string') {
      toSave.headers = JsonUtil.serializeSafe(dto.headers) || null;
    }
    if (dto.validation && typeof dto.validation !== 'string') {
      toSave.validation = JsonUtil.serializeSafe(dto.validation) || null;
    }
    // responseTemplate may be provided as object by callers; ensure string
    if (dto.responseTemplate && typeof dto.responseTemplate !== 'string') {
      toSave.responseTemplate =
        JsonUtil.serializeSafe(dto.responseTemplate) || '{}';
    }

    const created = await this.prisma.mockEndpoint.create({
      data: toSave as any,
    });
    // evict list cache
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    return JsonUtil.deserializeFields(created, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async findById(id: string): Promise<IMockEndpoint | null> {
    const row = await this.prisma.mockEndpoint.findUnique({
      where: { id },
    });
    if (!row) return null;
    return JsonUtil.deserializeFields(row, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async update(
    id: string,
    dto: UpdateMockEndpointDto,
  ): Promise<IMockEndpoint | null> {
    const toSave = { ...dto } as any;
    if (dto.headers && typeof dto.headers !== 'string') {
      toSave.headers = JsonUtil.serializeSafe(dto.headers) || null;
    }
    if (dto.validation && typeof dto.validation !== 'string') {
      toSave.validation = JsonUtil.serializeSafe(dto.validation) || null;
    }
    if (dto.responseTemplate && typeof dto.responseTemplate !== 'string') {
      toSave.responseTemplate =
        JsonUtil.serializeSafe(dto.responseTemplate) || '{}';
    }

    const updated = await this.prisma.mockEndpoint.update({
      where: { id },
      data: { ...toSave, version: { increment: 1 } },
    });
    // invalidate list cache and endpoint-specific caches
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    // 清除精确匹配缓存
    await this.cacheService
      .delPattern(`mock:endpoint:exact:${updated.path}:*`)
      .catch(() => {});
    await this.cacheService
      .delPattern(`mock:endpoint:${updated.path}:*`)
      .catch(() => {});
    return JsonUtil.deserializeFields(updated, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async remove(id: string) {
    const endpoint = await this.findById(id);
    if (!endpoint) return null;
    await this.prisma.mockEndpoint.delete({ where: { id } });
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    // 清除精确匹配缓存
    await this.cacheService
      .delPattern(`mock:endpoint:exact:${endpoint.path}:*`)
      .catch(() => {});
    await this.cacheService
      .delPattern(`mock:endpoint:${endpoint.path}:*`)
      .catch(() => {});
    return { message: '已删除' };
  }

  async enable(id: string): Promise<IMockEndpoint | null> {
    const updated = await this.prisma.mockEndpoint.update({
      where: { id },
      data: { enabled: true, version: { increment: 1 } },
    });
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    // 清除精确匹配缓存
    await this.cacheService
      .delPattern(`mock:endpoint:exact:${updated.path}:*`)
      .catch(() => {});
    return JsonUtil.deserializeFields(updated, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async disable(id: string): Promise<IMockEndpoint | null> {
    const updated = await this.prisma.mockEndpoint.update({
      where: { id },
      data: { enabled: false, version: { increment: 1 } },
    });
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    // 清除精确匹配缓存
    await this.cacheService
      .delPattern(`mock:endpoint:exact:${updated.path}:*`)
      .catch(() => {});
    return JsonUtil.deserializeFields(updated, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async clearCache() {
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    await this.cacheService.delPattern('mock:endpoint:*').catch(() => {});
    return { message: '缓存已清除' };
  }

  /**
   * Find a matching enabled endpoint for a given path and method.
   * 优化的缓存策略:
   * 1. 先尝试精确匹配缓存 (path + method)
   * 2. 如果未命中,查询数据库并缓存结果
   * 3. 使用列表缓存作为兜底方案
   */
  async findMatchingEndpoint(
    path: string,
    method: string,
  ): Promise<{ endpoint: IMockEndpoint; params: Record<string, any> } | null> {
    // 策略 1: 尝试精确匹配缓存 (适用于静态路径如 /users)
    const exactCacheKey = this.cacheService.generateKey(
      'mock:endpoint:exact',
      path,
      method,
    );
    const cachedExact = await this.cacheService.get<{
      endpoint: IMockEndpoint;
      params: Record<string, any>;
    }>(exactCacheKey);

    if (cachedExact) {
      return cachedExact;
    }

    // 策略 2: 查询数据库中所有启用的端点 (带缓存)
    const endpoints = (await this.cacheService.getOrSet(
      this.ALL_KEY,
      async () => {
        const rows = await this.prisma.mockEndpoint.findMany({
          where: { enabled: true },
        });
        // deserialize fields for usage by guard
        return rows.map(
          r =>
            JsonUtil.deserializeFields(r, [
              'headers',
              'validation',
            ]) as IMockEndpoint,
        );
      },
      60, // 增加 TTL 到 60 秒
    )) as IMockEndpoint[];

    // 策略 3: 遍历匹配路径模式
    for (const endpoint of endpoints || []) {
      const pattern = endpoint.path.startsWith('/')
        ? endpoint.path
        : `/${endpoint.path}`;
      const m = PathMatcher.match(pattern, path);
      const methodMatches =
        endpoint.method === 'ALL' || endpoint.method === method;

      if (m.matched && methodMatches) {
        const result = { endpoint, params: m.params };

        // 缓存精确匹配结果 (TTL 300秒)
        await this.cacheService.set(exactCacheKey, result, 300).catch(() => {});

        return result;
      }
    }

    return null;
  }

  async logCall(data: MockLogCreateDto): Promise<void> {
    // delegate to MockLoggerService for persistence (best-effort)
    try {
      await this.mockLogger.log(data as any);
    } catch {
      // swallow
    }
  }

  /**
   * 批量启用 Mock 端点
   */
  async batchEnable(
    ids: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.enable(id);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 批量禁用 Mock 端点
   */
  async batchDisable(
    ids: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.disable(id);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 批量删除 Mock 端点
   */
  async batchDelete(
    ids: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.remove(id);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 导出所有 Mock 配置
   */
  async exportConfig(): Promise<IMockEndpoint[]> {
    return this.list();
  }

  /**
   * 导入 Mock 配置
   */
  async importConfig(
    endpoints: CreateMockEndpointDto[],
    options?: { overwrite?: boolean },
  ): Promise<{ success: number; failed: number; skipped: number }> {
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const dto of endpoints) {
      try {
        // 检查是否已存在相同 path + method 的端点
        const existing = await this.prisma.mockEndpoint.findFirst({
          where: {
            path: dto.path,
            method: dto.method as any,
          },
        });

        if (existing) {
          if (options?.overwrite) {
            // 覆盖模式:更新现有端点
            await this.update(existing.id, dto);
            success++;
          } else {
            // 跳过已存在的端点
            skipped++;
          }
        } else {
          // 创建新端点
          await this.create(dto);
          success++;
        }
      } catch {
        failed++;
      }
    }

    return { success, failed, skipped };
  }

  /**
   * 获取 Mock 统计信息
   */
  async getStats() {
    const [totalEndpoints, enabledEndpoints, totalLogs, recentLogs] =
      await Promise.all([
        this.prisma.mockEndpoint.count(),
        this.prisma.mockEndpoint.count({ where: { enabled: true } }),
        this.prisma.mockLog.count(),
        this.prisma.mockLog.findMany({
          take: 100,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    // 计算平均响应时间
    const avgDuration =
      recentLogs.length > 0
        ? recentLogs.reduce((sum, log) => sum + log.duration, 0) /
          recentLogs.length
        : 0;

    // 计算缓存命中率
    const cacheHits = recentLogs.filter(log => log.cacheHit).length;
    const cacheHitRate =
      recentLogs.length > 0 ? (cacheHits / recentLogs.length) * 100 : 0;

    return {
      totalEndpoints,
      enabledEndpoints,
      disabledEndpoints: totalEndpoints - enabledEndpoints,
      totalCalls: totalLogs,
      recentCalls: recentLogs.length,
      avgResponseTime: Math.round(avgDuration),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }

  /**
   * 查询 Mock 调用日志
   */
  async queryLogs(query: {
    page?: number;
    pageSize?: number;
    endpointId?: string;
    method?: string;
    path?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.endpointId) {
      where.endpointId = query.endpointId;
    }
    if (query.method) {
      where.method = query.method;
    }
    if (query.path) {
      where.path = { contains: query.path };
    }

    const [items, total] = await Promise.all([
      this.prisma.mockLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mockLog.count({ where }),
    ]);

    return {
      items: items.map(item =>
        JsonUtil.deserializeFields(item, [
          'query',
          'body',
          'headers',
          'response',
        ]),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 清空 Mock 调用日志
   */
  async clearLogs(endpointId?: string) {
    const where = endpointId ? { endpointId } : {};
    const result = await this.prisma.mockLog.deleteMany({ where });
    return {
      message: '日志已清除',
      deleted: result.count,
    };
  }
}
