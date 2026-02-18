import { Injectable } from '@nestjs/common';
import { JsonUtil } from '@/common/utils/json.util';
import { LogsService } from '@/modules/logs/logs.service';
import { PrismaService } from '@/shared/database/prisma.service';
import {
  IAuditLogOptions,
  IResourceAdapter,
} from '@/shared/audit/interfaces/audit-log.interface';
import { ResourceAdapterRegistry } from '@/shared/audit/resource-adapter.registry';
import { RequestContextService } from '@/shared/request-context/request-context.service';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: ResourceAdapterRegistry,
  ) {}

  /**
   * 执行审计日志记录
   * @param options 装饰器选项
   * @param originalMethod 被装饰的原方法
   * @param args 方法参数
   * @param context 方法执行上下文(this)
   * @returns 原方法的返回值
   */
  async execute(
    options: IAuditLogOptions,
    originalMethod: (...args: any[]) => any,
    args: any[],
    context: any,
  ): Promise<any> {
    // 1. 尝试从 args 提取 resourceId(UPDATE/DELETE 场景)
    const resourceIdFromArgs = this.extractResourceIdFromArgs(options, args);

    // 2. 如果有 resourceId,先获取 oldData(同步阻塞,确保在业务方法执行前)
    let oldData: any;
    if (resourceIdFromArgs !== undefined) {
      const isBatch = Boolean(options.batch);
      const resourceIds = isBatch
        ? this.normalizeResourceIds(resourceIdFromArgs)
        : resourceIdFromArgs;
      oldData = await this.fetchOldData(options, resourceIds);
    }

    // 3. 执行业务方法
    const result = await originalMethod.apply(context, args);

    // 4. 如果是 CREATE(resourceIdFromResult),从 result 提取 ID
    const resourceId =
      resourceIdFromArgs ?? this.extractResourceIdFromResult(options, result);

    // 5. 条件检查
    if (!this.shouldLog(options, args, result, context)) {
      return result;
    }

    // 6. 异步创建审计日志,传入预获取的 oldData
    this.createAuditLogAsync(options, resourceId, oldData, result).catch(
      error => {
        console.error('[AuditLogService] Failed to create audit log:', error);
      },
    );

    return result;
  }

  private async createAuditLogAsync(
    options: IAuditLogOptions,
    resourceId: string | number | (string | number)[] | undefined,
    oldData: any,
    result: any,
  ): Promise<void> {
    try {
      const requestId = RequestContextService.getRequestId() ?? null;
      const userId = RequestContextService.getUserId() ?? null;
      const ip = RequestContextService.getIp() ?? null;
      const userAgent =
        (RequestContextService.get('userAgent') as string) ?? null;

      const isBatch = Boolean(options.batch);
      const resourceIds = isBatch ? this.normalizeResourceIds(resourceId) : [];

      if (isBatch) {
        const data = this.buildBatchCreateData(
          options,
          resourceIds,
          oldData,
          result,
          userId,
          ip,
          requestId,
          userAgent,
        );

        await this.prisma.auditLog.createMany({
          data,
          skipDuplicates: true,
        });
      } else {
        await this.logsService.createAuditLog(
          this.buildCreateDto(
            options,
            resourceId,
            oldData,
            result,
            userId,
            ip,
            requestId,
            userAgent,
          ),
        );
      }
    } catch (error) {
      console.error('[AuditLogService] Failed to create audit log:', error);
    }
  }

  private shouldLog(
    options: IAuditLogOptions,
    args: any[],
    result: any,
    context: any,
  ): boolean {
    if (!options.condition) {
      return true;
    }

    try {
      return Boolean(options.condition(args, result, context));
    } catch (error) {
      console.error('[AuditLogService] Condition check failed:', error);
      return false;
    }
  }

  private async fetchOldData(
    options: IAuditLogOptions,
    resourceId: string | number | (string | number)[] | undefined,
  ): Promise<any> {
    if (resourceId === undefined || resourceId === null) {
      return undefined;
    }

    let adapter: IResourceAdapter;
    try {
      adapter = this.adapterRegistry.getAdapter(options.resource);
    } catch (error) {
      console.error(
        '[AuditLogService] Failed to resolve resource adapter:',
        error,
      );
      return undefined;
    }

    if (Array.isArray(resourceId)) {
      if (resourceId.length === 0) {
        return [];
      }
      return adapter.findByIds(resourceId);
    }

    return adapter.findById(resourceId);
  }

  /**
   * 从方法参数提取 resourceId (UPDATE/DELETE 场景)
   */
  private extractResourceIdFromArgs(
    options: IAuditLogOptions,
    args: any[],
  ): string | number | (string | number)[] | undefined {
    if (options.resourceIdArg !== undefined) {
      return args[options.resourceIdArg];
    }

    if (options.resourceIdPath) {
      return this.getNestedProperty(args[0], options.resourceIdPath);
    }

    return undefined;
  }

  /**
   * 从方法返回值提取 resourceId (CREATE 场景)
   */
  private extractResourceIdFromResult(
    options: IAuditLogOptions,
    result: any,
  ): string | number | (string | number)[] | undefined {
    if (options.resourceIdFromResult) {
      return this.getNestedProperty(result, options.resourceIdFromResult);
    }

    return undefined;
  }

  /**
   * @deprecated 使用 extractResourceIdFromArgs 和 extractResourceIdFromResult 替代
   */
  private extractResourceId(
    options: IAuditLogOptions,
    args: any[],
    result: any,
  ): string | number | (string | number)[] | undefined {
    if (options.resourceIdArg !== undefined) {
      return args[options.resourceIdArg];
    }

    if (options.resourceIdPath) {
      return this.getNestedProperty(args[0], options.resourceIdPath);
    }

    if (options.resourceIdFromResult) {
      return this.getNestedProperty(result, options.resourceIdFromResult);
    }

    return undefined;
  }

  private normalizeResourceIds(
    resourceId: string | number | (string | number)[] | undefined,
  ): (string | number)[] {
    if (Array.isArray(resourceId)) {
      return resourceId;
    }

    if (resourceId === undefined || resourceId === null) {
      return [];
    }

    return [resourceId];
  }

  private buildBatchCreateData(
    options: IAuditLogOptions,
    resourceIds: (string | number)[],
    oldData: any,
    result: any,
    userId: string | null,
    ip: string | null,
    requestId: string | null,
    userAgent: string | null,
  ) {
    const oldDataMap = this.buildOldDataMap(oldData);

    return resourceIds.map(id =>
      this.buildCreateManyData(
        options,
        id,
        oldDataMap?.get(String(id)),
        result,
        userId,
        ip,
        requestId,
        userAgent,
      ),
    );
  }

  private buildCreateManyData(
    options: IAuditLogOptions,
    resourceId: string | number | (string | number)[] | undefined,
    oldData: any,
    result: any,
    userId: string | null,
    ip: string | null,
    requestId: string | null,
    userAgent: string | null,
  ) {
    return {
      userId,
      requestId,
      action: options.action,
      resource: options.resource,
      resourceId:
        resourceId === undefined || resourceId === null
          ? null
          : String(resourceId),
      oldData: JsonUtil.serialize(oldData),
      newData: JsonUtil.serialize(result),
      ip,
      userAgent,
    };
  }

  private buildCreateDto(
    options: IAuditLogOptions,
    resourceId: string | number | (string | number)[] | undefined,
    oldData: any,
    result: any,
    userId: string | null,
    ip: string | null,
    requestId: string | null,
    userAgent: string | null,
  ) {
    return {
      userId: userId ?? undefined,
      requestId: requestId ?? undefined,
      action: options.action,
      resource: options.resource,
      resourceId:
        resourceId === undefined || resourceId === null
          ? undefined
          : String(resourceId),
      oldData,
      newData: result,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    };
  }

  private buildOldDataMap(oldData: any): Map<string, any> | null {
    if (!Array.isArray(oldData)) {
      return null;
    }

    const map = new Map<string, any>();
    oldData.forEach(item => {
      const key = item?.id ?? item?.resourceId;
      if (key !== undefined && key !== null) {
        map.set(String(key), item);
      }
    });

    return map;
  }

  private getNestedProperty(target: any, path: string): any {
    if (!target || !path) {
      return undefined;
    }

    return path.split('.').reduce((current, key) => {
      if (current === undefined || current === null) {
        return undefined;
      }

      const resolvedKey =
        Array.isArray(current) && /^\d+$/.test(key) ? Number(key) : key;

      return current[resolvedKey];
    }, target);
  }
}
