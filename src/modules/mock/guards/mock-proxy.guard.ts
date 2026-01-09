import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';
import { IMockContext } from '@/modules/mock/interfaces';
import { MockService } from '../services/mock.service';
import { MockEngineService } from '../services/mock-engine.service';

@Injectable()
export class MockProxyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly mockEngine: MockEngineService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const rawPath = req.path || req.url || '';
    const apiPrefix = this.configService.get('app.apiPrefix');

    // 只处理 /api/v1/mock/* 路径,排除 /api/v1/mock-endpoints/*
    const mockPattern = new RegExp(`^/${apiPrefix}/mock(/|$)`);
    if (!mockPattern.test(rawPath)) {
      // 不是 Mock 代理路径,跳过处理
      return true;
    }

    // 去掉 API 前缀和 /mock 前缀
    const path = rawPath.replace(new RegExp(`^/${apiPrefix}/mock`), '') || '/';
    const method = (req.method || 'GET').toUpperCase();
    const match = await this.mockService.findMatchingEndpoint(path, method);

    if (!match) {
      // 直接抛出一个 404 响应
      throw new BusinessException(ErrorCode.MOCK_NOT_FOUND);
    }

    const { endpoint, params, cacheHit } = match;

    const startedAt = Date.now();

    // 设置延迟
    if (endpoint.delay && endpoint.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, endpoint.delay));
    }

    // 渲染模板
    let data: unknown = null;
    try {
      const ctx: IMockContext = {
        params: params || {},
        query: req.query || {},
        body: req.body,
        headers: req.headers,
        request: req,
      };

      data = await this.mockEngine.render(
        endpoint.responseTemplate || '{}',
        endpoint.templateEngine,
        ctx,
      );
    } catch (err) {
      throw new BusinessException(
        ErrorCode.MOCK_RENDER_ERROR,
        `${ErrorMessages[ErrorCode.MOCK_RENDER_ERROR]}: ${String(err)}`,
      );
    }

    const normalizeRendered = (r: unknown): unknown => {
      if (r === undefined) return null;
      if (r === null) return null;
      if (typeof r === 'object') return r;
      return { data: r };
    };

    if (endpoint.headers) {
      try {
        res.set(endpoint.headers as Record<string, string>);
      } catch {
        // ignore header set errors
      }
    }

    const duration = Date.now() - startedAt;

    const normalized = normalizeRendered(data);

    res.status(endpoint.statusCode || 200).json(normalized);

    this.mockService
      .logCall({
        endpointId: endpoint.id,
        method,
        path: rawPath,
        query: req.query,
        body: req.body,
        headers: req.headers,
        ip: req.ip || req.connection?.remoteAddress,
        response: normalized,
        statusCode: endpoint.statusCode || 200,
        duration,
        cacheHit,
      })
      .catch(() => {});

    // 返回 true 表示请求已被处理,允许继续
    return true;
  }
}
