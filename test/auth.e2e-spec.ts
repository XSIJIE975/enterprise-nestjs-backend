import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';

/**
 * Auth E2E Tests
 * 测试认证流程：登录/登出/Token刷新/会话管理
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let apiPrefix: string;

  // 测试账户 - 来自 seed 数据
  const adminCredentials = {
    username: 'admin@enterprise.local',
    password: 'admin123456',
  };

  const testUserCredentials = {
    username: 'test@enterprise.local',
    password: 'test123456',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configService = app.get(ConfigService);
    apiPrefix = configService.get('app.apiPrefix') || 'api/v1';

    // 配置全局前缀（与 main.ts 保持一致）
    app.setGlobalPrefix(apiPrefix);

    // 配置全局管道（与 main.ts 保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login - 用户登录', () => {
    it('should login successfully with valid admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send(adminCredentials)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(typeof res.body.data.refreshToken).toBe('string');
      expect(res.body.data.accessToken.length).toBeGreaterThan(20);
      expect(res.body.data.refreshToken.length).toBeGreaterThan(20);
    });

    it('should login successfully with test user credentials', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send(testUserCredentials)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send({
          username: adminCredentials.username,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send({
          username: 'nonexistent@example.com',
          password: 'somepassword',
        })
        .expect(401);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject login with empty credentials', async () => {
      // API 对空凭证返回 401 而非 400
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send({})
        .expect(401);
    });

    it('should reject login with missing password', async () => {
      // API 对缺少密码返回 401 而非 400
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send({ username: adminCredentials.username })
        .expect(401);
    });
  });

  describe('POST /auth/refresh - Token 刷新', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // 先登录获取 refreshToken
      const loginRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send(adminCredentials);

      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
    });

    it('should reject refresh with invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/refresh`)
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject refresh with empty refresh token', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/refresh`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/logout - 用户登出', () => {
    it('should logout successfully and revoke session', async () => {
      // 1. 先登录获取 token
      const loginRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send(testUserCredentials);

      const accessToken = loginRes.body.data.accessToken;

      // 2. 登出
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/logout`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 3. 验证 token 已失效 - 使用需要认证的接口
      const meRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/me`)
        .set('Authorization', `Bearer ${accessToken}`);

      // 登出后 token 应该失效
      expect(meRes.status).toBe(401);
    });

    it('should reject logout without authorization header', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/logout`)
        .expect(401);
    });

    it('should reject logout with invalid token', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/logout`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/me - 获取当前用户信息', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/login`)
        .send(adminCredentials);

      accessToken = loginRes.body.data.accessToken;
    });

    it('should return current user info with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.username).toBe('admin');
      expect(res.body.data.email).toBe('admin@enterprise.local');
      expect(res.body.data.roles).toBeDefined();
      expect(Array.isArray(res.body.data.roles)).toBe(true);
      expect(res.body.data.permissions).toBeDefined();
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    it('should reject request without authorization', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/me`)
        .expect(401);
    });
  });

  describe('POST /auth/register - 用户注册', () => {
    const uniqueSuffix = Date.now();

    it('should register new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/register`)
        .send({
          email: `newuser${uniqueSuffix}@test.com`,
          username: `newuser${uniqueSuffix}`,
          password: 'Password123',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(`newuser${uniqueSuffix}@test.com`);
      expect(res.body.data.username).toBe(`newuser${uniqueSuffix}`);
    });

    it('should reject registration with existing email', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/register`)
        .send({
          email: 'admin@enterprise.local', // 已存在
          username: 'uniqueusername',
          password: 'Password123',
        })
        .expect(409);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject registration with invalid email format', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/register`)
        .send({
          email: 'invalid-email',
          username: 'validusername',
          password: 'Password123',
        })
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/register`)
        .send({
          email: `weakpwd${uniqueSuffix}@test.com`,
          username: `weakpwd${uniqueSuffix}`,
          password: '123', // 太弱
        })
        .expect(400);
    });

    it('should reject registration with short username', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/auth/register`)
        .send({
          email: `shortname${uniqueSuffix}@test.com`,
          username: 'ab', // 太短
          password: 'Password123',
        })
        .expect(400);
    });
  });
});
