import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';

type CsrfRequest = Request & { cookies?: Record<string, string | undefined> };

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly enabled: boolean;
  private readonly headerName: string;
  private readonly cookieName: string;
  private readonly sessionCookieName: string;
  private readonly apiPrefix: string;
  private readonly exemptPathPrefixes: string[];
  private readonly validateRequest: (req: CsrfRequest) => boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const csrfConfig =
      this.configService.get<Record<string, any>>('security.csrf') ?? {};

    this.enabled = !!csrfConfig.enabled;
    this.cookieName = csrfConfig.cookieName || 'XSRF-TOKEN';
    this.headerName = String(
      csrfConfig.headerName || 'X-XSRF-TOKEN',
    ).toLowerCase();
    this.sessionCookieName = csrfConfig.sessionCookieName || 'csrf.sid';

    this.apiPrefix = `/${String(this.configService.get('app.apiPrefix') || '')}`
      .replace(/\/+/g, '/')
      .replace(/\/+$/, '');

    const envExemptPaths: string[] = Array.isArray(csrfConfig.exemptPaths)
      ? csrfConfig.exemptPaths
      : [];
    this.exemptPathPrefixes = this.buildExemptPrefixes(envExemptPaths);

    const { validateRequest } = doubleCsrf({
      getSecret: () => String(csrfConfig.secret || ''),
      getSessionIdentifier: (req: CsrfRequest) =>
        String(req.cookies?.[this.sessionCookieName] || ''),
      cookieName: this.cookieName,
      cookieOptions: csrfConfig.cookieOptions,
      getCsrfTokenFromRequest: (req: CsrfRequest) =>
        this.getCsrfTokenFromRequest(req),
    });

    this.validateRequest = validateRequest;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.enabled) {
      return true;
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const req = context.switchToHttp().getRequest<CsrfRequest>();
    const method = String(req.method || '').toUpperCase();

    // 仅保护有副作用的请求（按需求：POST/PUT/DELETE）
    if (!['POST', 'PUT', 'DELETE'].includes(method)) {
      return true;
    }

    if (this.isExemptRequest(req)) {
      return true;
    }

    const ok = this.validateRequest(req);
    if (!ok) {
      throw new ForbiddenException('invalid csrf token');
    }

    return true;
  }

  private getCsrfTokenFromRequest(req: CsrfRequest): string | undefined {
    const value = req.headers?.[this.headerName];
    if (Array.isArray(value)) {
      return value[0];
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  }

  private isExemptRequest(req: CsrfRequest): boolean {
    const originalUrl = String((req as any).originalUrl || req.url || '');
    const pathname = this.getPathname(originalUrl);
    return this.exemptPathPrefixes.some(prefix => pathname.startsWith(prefix));
  }

  private getPathname(urlOrPath: string): string {
    // 保证只拿 path，不包含 query
    const maybeUrl = urlOrPath.startsWith('http')
      ? urlOrPath
      : `http://localhost${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
    try {
      return new URL(maybeUrl).pathname.replace(/\/+/g, '/');
    } catch {
      return `/${urlOrPath}`.replace(/\/+/g, '/');
    }
  }

  private buildExemptPrefixes(extra: string[]): string[] {
    const base = ['/health', '/mock'];
    const normalizedExtra = extra
      .map(p => String(p || '').trim())
      .filter(Boolean)
      .map(p => (p.startsWith('/') ? p : `/${p}`));

    const all = Array.from(new Set([...base, ...normalizedExtra]));
    const prefixed = all
      .filter(() => this.apiPrefix && this.apiPrefix !== '/')
      .map(p => `${this.apiPrefix}${p}`.replace(/\/+/g, '/'));

    return Array.from(new Set([...all, ...prefixed]));
  }
}
