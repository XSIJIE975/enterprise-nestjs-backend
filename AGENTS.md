# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-20
**Commit:** 9b1c03b
**Branch:** main

## OVERVIEW

Enterprise NestJS 11 backend (Node 22, TS 5, Prisma/MySQL, Redis) with JWT (access+refresh), RBAC, requestId tracing, structured logging, caching, and Swagger.

## QUICK START (Start here)

### Module map (most common entry points)

| Area                                             | Entry files/dirs                                   | Notes                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Bootstrap / global middleware / Swagger          | `src/main.ts`                                      | Global prefix is `app.apiPrefix`; serves static assets from `public/`                                      |
| Global module wiring / interceptors / throttling | `src/app.module.ts`                                | `ConfigModule.forRoot` + `APP_INTERCEPTOR`                                                                 |
| Auth (JWT access + refresh)                      | `src/modules/auth/*`                               | Key files: `auth.service.ts`, `strategies/jwt.strategy.ts`, `guards/jwt-auth.guard.ts`                     |
| RBAC (roles/permissions)                         | `src/modules/roles/*`, `src/modules/permissions/*` | Enforcement entry is mostly `src/common/guards/*`                                                          |
| RBAC cache                                       | `src/shared/cache/business/rbac-cache.service.ts`  | Role/permission changes often flush all; user-specific changes often call `deleteUserCache(userId)`        |
| Logging (API/error/audit)                        | `src/modules/logs/*`                               | Producers: `src/common/interceptors/logging.interceptor.ts`, `src/common/filters/http-exception.filter.ts` |
| Health checks                                    | `src/modules/health/*`                             | `health.controller.ts`, `health.service.ts` (db/redis/memory/disk)                                         |
| Mock                                             | `src/modules/mock/*`                               | Proxy entry: `guards/mock-proxy.guard.ts` (matches by `app.apiPrefix`)                                     |
| Public API (`/api`)                              | `src/modules/public-api/*`                         | Global prefix excludes `api` (see `src/main.ts`)                                                           |

### Two global toggles that frequently cause confusion

- **Database log persistence toggle**:
  - Global: `app.log.enableDatabase`
  - Fine-grained: `@EnableDatabaseLog()` / `@DisableDatabaseLog()` (see `src/common/decorators/database-log.decorator.ts` and `src/common/interceptors/logging.interceptor.ts`)
- **API logs are written asynchronously**: `LoggingInterceptor` starts DB writes but does not `await`; failures only emit error logs and do not block responses.

### Tests / environment loading

- `pnpm test` / `pnpm test:e2e` load `.env.test` via `dotenv -e .env.test` (see `package.json` scripts).

### Prisma import convention

- Prefer `@/prisma/prisma/client` for the generated Prisma Client (instead of importing directly from `@prisma/client`).

## STRUCTURE

```
./
├── src/
│   ├── main.ts                 # Nest bootstrap + middleware (CORS/helmet/body limits) + Swagger
│   ├── app.module.ts           # Global module wiring (Config/Throttler/Interceptors)
│   ├── config/                 # registerAs() configs; loaded globally
│   ├── common/                 # decorators/guards/filters/interceptors/VO/DTO helpers
│   ├── shared/                 # cross-cutting services (db/cache/logger/request-context)
│   ├── modules/                # business modules (auth/users/roles/permissions/logs/mock/health/public-api)
│   └── generated/prisma/        # GENERATED Prisma client output (do not edit)
├── prisma/
│   ├── schema.prisma            # generator output -> src/generated/prisma
│   ├── models/*.prisma          # split models (auth/rbac/logging/system/mock)
│   ├── migrations/*/migration.sql
│   └── seed.ts                  # seed data (includes default accounts)
├── test/                        # e2e tests (jest-e2e.json)
├── scripts/                     # start/deploy scripts + prisma migration tools
├── docs/                        # project docs (architecture/guides/modules)
├── dist/                        # build output (do not edit)
└── coverage/                    # test output
```

## WHERE TO LOOK

| Task                                               | Location                                                                       | Notes                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| App bootstrap, CORS/helmet, static assets, Swagger | `src/main.ts`                                                                  | Global prefix uses `app.apiPrefix` (default `api/v1`); serves `public/` |
| Module wiring + global interceptors/guards         | `src/app.module.ts`                                                            | `ConfigModule.forRoot` + `APP_INTERCEPTOR` + throttling                 |
| Config keys / env mapping                          | `src/config/*.config.ts`                                                       | Loaded via `src/config/index.ts`                                        |
| RequestId + AsyncLocalStorage context              | `src/shared/request-context/*` + `src/common/middlewares/logger.middleware.ts` | Response header `X-Request-Id`                                          |
| Unified error format + DB error logging            | `src/common/filters/http-exception.filter.ts`                                  | Sanitizes sensitive fields in body                                      |
| Structured logging wrapper (winston)               | `src/shared/logger/*`                                                          | Auto-includes `requestId`/`userId` via RequestContext                   |
| Prisma client + DB connectivity                    | `src/shared/database/prisma.service.ts` + `prisma/schema.prisma`               | Dev allows DB connect failure; non-dev throws                           |
| Auth (JWT access+refresh)                          | `src/modules/auth/*`                                                           | Token blacklist + session model; docs: `docs/modules/authentication.md` |
| RBAC (roles/permissions)                           | `src/modules/roles/*`, `src/modules/permissions/*`, `src/common/guards/*`      | RBAC cache in `src/shared/cache/business/rbac-cache.service.ts`         |
| Logs (API/error/audit)                             | `src/modules/logs/*`                                                           | RequestId is first-class; docs: `docs/modules/logging.md`               |
| Mock module                                        | `src/modules/mock/*`                                                           | Has guard logic for prefix routing                                      |
| Health checks                                      | `src/modules/health/*`                                                         | Terminus-based liveness/readiness endpoints                             |
| Cache implementations                              | `src/shared/cache/*`                                                           | Redis optional; can auto-downgrade to memory                            |

## CONVENTIONS (PROJECT-SPECIFIC)

- Path aliases via `tsconfig.json`:
  - `@/* -> src/*`
  - `@/shared/*`, `@/modules/*`, `@/common/*`, `@/config/*`
  - `@/prisma/* -> src/generated/*` (Prisma client lives under `src/generated/prisma`)
- Config loading order (`ConfigModule.forRoot`): `.env.local`, `.env.${NODE_ENV}`, `.env`.
- API prefix default: `api/v1` (`src/config/app.config.ts`), applied in `src/main.ts`.
- Global prefix exclusions: `''`, `api`, `api/docs` (see `src/main.ts`).
- Timezone: app default `Asia/Shanghai`; request override via `X-Timezone` (validated).
- Request tracing: requestId injected early by middleware and available everywhere via `RequestContextService`.

## ANTI-PATTERNS (THIS PROJECT)

- Do not edit build artifacts: `dist/**`, `coverage/**`.
- Do not manually edit generated Prisma client: `src/generated/prisma/**` (generated by `pnpm db:generate`).
- Do not run production with `ALLOWED_ORIGINS` containing `*` (bootstrap refuses to start in production).
- Avoid leaking secrets in logs/exception context; `AllExceptionsFilter.sanitizeBody()` only redacts a small fixed set.

## COMMANDS

```bash
# dev
pnpm start:dev
pnpm start:debug

# quality
pnpm type-check
pnpm lint
pnpm format

# tests
pnpm test
pnpm test:e2e

# prisma
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# docker environments
pnpm docker:dev
pnpm docker:test
pnpm docker:prod

# convenience
pnpm dev:setup
```

## NOTES

- `express` is v5.x; middleware behavior differs slightly from older NestJS examples.
- LSP TS server is not installed in this environment; rely on repo docs + search + tests for navigation.
