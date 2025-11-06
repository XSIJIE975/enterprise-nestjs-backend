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

@Injectable()
export class MockService {
  private readonly ALL_KEY = 'mock:endpoints:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: MockCacheService,
    private readonly mockLogger: MockLoggerService,
  ) {}

  async list(): Promise<IMockEndpoint[]> {
    // simple list from DB
    const rows = await (this.prisma as any).mockEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // deserialize JSON-like fields stored as TEXT
    return rows.map(
      (r: any) =>
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

    const created = await (this.prisma as any).mockEndpoint.create({
      data: toSave,
    });
    // evict list cache
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    return JsonUtil.deserializeFields(created, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async findById(id: string): Promise<IMockEndpoint | null> {
    const row = await (this.prisma as any).mockEndpoint.findUnique({
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

    const updated = await (this.prisma as any).mockEndpoint.update({
      where: { id },
      data: { ...toSave, version: { increment: 1 } } as any,
    });
    // invalidate list cache and endpoint-specific caches
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
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
    await (this.prisma as any).mockEndpoint.delete({ where: { id } });
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    await this.cacheService
      .delPattern(`mock:endpoint:${endpoint.path}:*`)
      .catch(() => {});
    return { message: 'deleted' };
  }

  async enable(id: string): Promise<IMockEndpoint | null> {
    const updated = await (this.prisma as any).mockEndpoint.update({
      where: { id },
      data: { enabled: true, version: { increment: 1 } } as any,
    });
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    return JsonUtil.deserializeFields(updated, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async disable(id: string): Promise<IMockEndpoint | null> {
    const updated = await (this.prisma as any).mockEndpoint.update({
      where: { id },
      data: { enabled: false, version: { increment: 1 } } as any,
    });
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    return JsonUtil.deserializeFields(updated, [
      'headers',
      'validation',
    ]) as IMockEndpoint;
  }

  async clearCache() {
    await this.cacheService.del(this.ALL_KEY).catch(() => {});
    await this.cacheService.delPattern('mock:endpoint:*').catch(() => {});
    return { message: 'cache cleared' };
  }

  /**
   * Find a matching enabled endpoint for a given path and method.
   * This implementation caches the list of enabled endpoints for short TTL.
   */
  async findMatchingEndpoint(
    path: string,
    method: string,
  ): Promise<{ endpoint: IMockEndpoint; params: Record<string, any> } | null> {
    // try cache list
    const endpoints = (await this.cacheService.getOrSet(
      this.ALL_KEY,
      async () => {
        const rows = await (this.prisma as any).mockEndpoint.findMany({
          where: { enabled: true },
        });
        // deserialize fields for usage by guard
        return rows.map(
          (r: any) =>
            JsonUtil.deserializeFields(r, [
              'headers',
              'validation',
            ]) as IMockEndpoint,
        );
      },
      30,
    )) as IMockEndpoint[];

    for (const endpoint of endpoints || []) {
      const pattern = endpoint.path.startsWith('/')
        ? endpoint.path
        : `/${endpoint.path}`;
      const m = PathMatcher.match(pattern, path);
      const methodMatches =
        endpoint.method === 'ALL' || endpoint.method === method;
      if (m.matched && methodMatches) {
        return { endpoint, params: m.params };
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
}
