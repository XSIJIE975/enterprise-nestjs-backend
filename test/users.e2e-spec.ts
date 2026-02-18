import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

/**
 * Users E2E Tests
 * 测试用户 CRUD：列表/创建/更新/删除/唯一性冲突
 */
describe('Users (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let apiPrefix: string;
  let adminToken: string;
  let testUserToken: string;

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

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // 获取 admin token
    const adminLoginRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send(adminCredentials);
    adminToken = adminLoginRes.body.data.accessToken;

    // 获取 test user token
    const testUserLoginRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send(testUserCredentials);
    testUserToken = testUserLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users - 用户列表查询', () => {
    it('should return user list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(0);
      expect(res.body.data.meta.page).toBeDefined();
      expect(res.body.data.meta.pageSize).toBeDefined();
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users?page=1&pageSize=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.pageSize).toBe(5);
    });

    it('should reject user list request from non-admin', async () => {
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });

    it('should reject user list request without authentication', async () => {
      await request(app.getHttpServer()).get(`/${apiPrefix}/users`).expect(401);
    });
  });

  describe('POST /users - 创建用户', () => {
    const uniqueSuffix = Date.now();

    it('should create new user with valid data', async () => {
      const newUser = {
        email: `e2euser${uniqueSuffix}@test.com`,
        username: `e2euser${uniqueSuffix}`,
        password: 'Password123',
        firstName: 'E2E',
        lastName: 'User',
      };

      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(newUser.email);
      expect(res.body.data.username).toBe(newUser.username);
      expect(res.body.data.firstName).toBe(newUser.firstName);
      expect(res.body.data.lastName).toBe(newUser.lastName);
      // 密码不应该返回
      expect(res.body.data.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@enterprise.local', // 已存在
          username: `unique${uniqueSuffix}`,
          password: 'Password123',
        })
        .expect(409);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject duplicate username', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `uniqueemail${uniqueSuffix}@test.com`,
          username: 'admin', // 已存在
          password: 'Password123',
        })
        .expect(409);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          username: `validuser${uniqueSuffix}`,
          password: 'Password123',
        })
        .expect(400);
    });

    it('should reject weak password', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `weakpwd${uniqueSuffix}@test.com`,
          username: `weakpwd${uniqueSuffix}`,
          password: '123', // 太弱
        })
        .expect(400);
    });

    it('should reject creation from non-admin', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          email: `noadmin${uniqueSuffix}@test.com`,
          username: `noadmin${uniqueSuffix}`,
          password: 'Password123',
        })
        .expect(403);
    });
  });

  describe('GET /users/:id - 获取用户详情', () => {
    let testUserId: string;

    beforeAll(async () => {
      // 获取用户列表以找到一个测试用户 ID
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users?pageSize=1`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.body.data?.data?.length > 0) {
        testUserId = res.body.data.data[0].id;
      }
    });

    it('should return user details for admin', async () => {
      if (!testUserId) {
        console.warn('No user found for testing GET /users/:id');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(testUserId);
      expect(res.body.data.email).toBeDefined();
      expect(res.body.data.username).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/non-existent-id-12345`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject request from non-admin', async () => {
      if (!testUserId) return;

      await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/${testUserId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });

  describe('PATCH /users/:id - 更新用户信息', () => {
    let createdUserId: string;
    const uniqueSuffix = Date.now();

    beforeAll(async () => {
      // 创建一个测试用户用于更新测试
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `updatetest${uniqueSuffix}@test.com`,
          username: `updatetest${uniqueSuffix}`,
          password: 'Password123',
          firstName: 'Update',
          lastName: 'Test',
        });

      if (res.body.data) {
        createdUserId = res.body.data.id;
      }
    });

    it('should update user info successfully', async () => {
      if (!createdUserId) {
        console.warn('No user created for update test');
        return;
      }

      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.lastName).toBe('Name');
    });

    it('should reject update with duplicate email', async () => {
      if (!createdUserId) return;

      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@enterprise.local', // 已存在
        })
        .expect(409);

      expect(res.body.code).not.toBe('200');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .patch(`/${apiPrefix}/users/non-existent-id-12345`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' })
        .expect(404);
    });

    it('should reject update from non-admin', async () => {
      if (!createdUserId) return;

      await request(app.getHttpServer())
        .patch(`/${apiPrefix}/users/${createdUserId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ firstName: 'Hacker' })
        .expect(403);
    });
  });

  describe('DELETE /users/:id - 删除用户', () => {
    let userToDeleteId: string;
    const uniqueSuffix = Date.now();

    beforeEach(async () => {
      // 每次测试前创建一个新用户用于删除
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `deletetest${uniqueSuffix}${Math.random()}@test.com`,
          username: `deletetest${uniqueSuffix}${Math.floor(Math.random() * 10000)}`,
          password: 'Password123',
        });

      if (res.body.data) {
        userToDeleteId = res.body.data.id;
      }
    });

    it('should delete user successfully (soft delete)', async () => {
      if (!userToDeleteId) {
        console.warn('No user created for delete test');
        return;
      }

      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 验证用户已被删除（查不到）
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/users/non-existent-id-12345`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject delete from non-admin', async () => {
      if (!userToDeleteId) return;

      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });

  describe('GET /users/profile/me - 获取当前用户资料', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/profile/me`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe('test@enterprise.local');
      expect(res.body.data.username).toBe('testuser');
    });

    it('should reject without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/profile/me`)
        .expect(401);
    });
  });

  describe('PATCH /users/profile/me - 更新个人资料', () => {
    it('should update own profile successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/users/profile/me`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Profile',
        })
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.lastName).toBe('Profile');
    });

    it('should reject profile update with existing email', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/users/profile/me`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          email: 'admin@enterprise.local', // 已存在
        })
        .expect(409);

      expect(res.body.code).not.toBe('200');
    });
  });

  describe('POST /users/:id/roles - 分配角色给用户', () => {
    let testUserId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users?pageSize=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 找到 test 用户
      const users = res.body.data?.data || [];
      const testUser = users.find(
        (u: any) => u.email === 'test@enterprise.local',
      );
      if (testUser) {
        testUserId = testUser.id;
      }
    });

    it('should assign roles to user', async () => {
      if (!testUserId) {
        console.warn('Test user not found');
        return;
      }

      // 先获取角色列表（GET /roles 返回数组，不是分页对象）
      const rolesRes = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      const roles = rolesRes.body.data || [];
      if (roles.length > 0) {
        const roleId = roles[0].id;

        const res = await request(app.getHttpServer())
          .post(`/${apiPrefix}/users/${testUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ roleIds: [roleId] })
          .expect(200);

        expect(res.body.code).toBe('200');
      }
    });
  });

  describe('GET /users/statistics - 用户统计', () => {
    it('should return user statistics for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/statistics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      // 统计接口返回 total 而非 totalUsers
      expect(typeof res.body.data.total).toBe('number');
      expect(typeof res.body.data.active).toBe('number');
      expect(typeof res.body.data.inactive).toBe('number');
    });

    it('should reject statistics request from non-admin', async () => {
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/users/statistics`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });
});
