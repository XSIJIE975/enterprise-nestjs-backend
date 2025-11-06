import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { MockService } from '../services/mock.service';
import { MockEngineService } from '../services/mock-engine.service';
import { CacheService } from '@/shared/cache/cache.service';
import { IMockContext } from '../interfaces/mock-context.interface';

@Injectable()
export class MockProxyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly mockEngine: MockEngineService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const rawPath = req.path || req.url || '';
    // 匹配，需要使用正则去掉整个应用的 API 前缀
    const apiPrefix = this.configService.get('app.apiPrefix');
    const path = rawPath.replace(new RegExp(`^/${apiPrefix}/mock`), '') || '/';
    const method = (req.method || 'GET').toUpperCase();
    const match = await this.mockService.findMatchingEndpoint(path, method);

    if (!match) {
      // 直接抛出一个 404 响应
      throw new BusinessException(ErrorCode.MOCK_NOT_FOUND);
    }

    const { endpoint, params } = match;

    const startedAt = Date.now();

    // optional delay
    if (endpoint.delay && endpoint.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, endpoint.delay));
    }

    // render template
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
      // render failed -> return 500
      res
        .status(500)
        .json({ message: 'Mock render error', error: String(err) });
      return false;
    }

    // helper: normalize rendered result
    const normalizeRendered = (r: unknown): unknown => {
      if (r === undefined) return null;
      if (r === null) return null;
      if (typeof r === 'object') return r;
      // primitive -> wrap into object to keep response predictable
      return { data: r };
    };

    // set headers if any
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

    // async log - not awaiting
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
        cacheHit: false,
      })
      .catch(() => {});

    return false; // response already sent
  }
}
