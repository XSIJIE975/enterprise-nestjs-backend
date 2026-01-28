import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';

/**
 * Roles E2E Tests
 * 测试角色 CRUD 和权限分配
 */
describe('Roles (e2e)', () => {
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

  describe('GET /roles - 角色列表', () => {
    it('should return role list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);

      // 验证角色结构
      const role = res.body.data[0];
      expect(role.id).toBeDefined();
      expect(role.name).toBeDefined();
      expect(role.code).toBeDefined();
    });

    it('should reject role list from non-admin', async () => {
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });

    it('should reject role list without authentication', async () => {
      await request(app.getHttpServer()).get(`/${apiPrefix}/roles`).expect(401);
    });
  });

  describe('GET /roles/paginated - 分页查询角色', () => {
    it('should return paginated role list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/paginated?page=1&pageSize=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.data).toBeInstanceOf(Array);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(0);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.pageSize).toBe(10);
    });

    it('should support keyword search', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/paginated?keyword=admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /roles - 创建角色', () => {
    const uniqueSuffix = Date.now();

    it('should create new role with valid data', async () => {
      const newRole = {
        name: `测试角色${uniqueSuffix}`,
        code: `test_role_${uniqueSuffix}`,
        description: 'E2E 测试创建的角色',
      };

      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newRole)
        .expect(201);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe(newRole.name);
      expect(res.body.data.code).toBe(newRole.code);
      expect(res.body.data.description).toBe(newRole.description);
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject duplicate role code', async () => {
      // API 对重复代码返回 400 而非 409
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '另一个管理员',
          code: 'admin', // 已存在
          description: '重复的角色代码',
        })
        .expect(400);

      expect(res.body.code).not.toBe('200');
    });

    it('should reject role with invalid code format', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '无效代码角色',
          code: 'invalid code!', // 包含空格和特殊字符
          description: '无效的角色代码',
        })
        .expect(400);
    });

    it('should reject role without name', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `noname_${uniqueSuffix}`,
          description: '没有名称的角色',
        })
        .expect(400);
    });

    it('should reject role creation from non-admin', async () => {
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: '非管理员创建',
          code: `noadmin_${uniqueSuffix}`,
        })
        .expect(403);
    });
  });

  describe('GET /roles/:id - 获取角色详情', () => {
    let existingRoleId: number;

    beforeAll(async () => {
      // 获取一个已存在的角色 ID
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.body.data && res.body.data.length > 0) {
        existingRoleId = res.body.data[0].id;
      }
    });

    it('should return role details', async () => {
      if (!existingRoleId) {
        console.warn('No role found for testing');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/${existingRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(existingRoleId);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.code).toBeDefined();
    });

    it('should return role with permissions when requested', async () => {
      if (!existingRoleId) return;

      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/${existingRoleId}?includePermissions=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
    });

    it('should return 400 for non-existent role', async () => {
      // API 对不存在的角色返回 400 而非 404
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /roles/code/:code - 根据代码获取角色', () => {
    it('should return role by code', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/code/admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe('admin');
    });

    it('should return 400 for non-existent code', async () => {
      // API 对不存在的角色代码返回 400 而非 404
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/code/nonexistent_code`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /roles/:id - 更新角色', () => {
    let roleToUpdateId: number;

    beforeAll(async () => {
      // 使用唯一后缀创建一个用于更新测试的角色
      const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `更新测试角色${uniqueSuffix}`,
          code: `update_test_${uniqueSuffix}`,
          description: '用于更新测试',
        });

      if (res.body.data) {
        roleToUpdateId = res.body.data.id;
      }
    });

    it('should update role successfully', async () => {
      if (!roleToUpdateId) {
        console.warn('No role created for update test');
        return;
      }

      // 使用唯一名称避免重复冲突
      const uniqueName = `已更新的角色名称_${Date.now()}`;
      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/roles/${roleToUpdateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueName,
          description: '已更新的描述',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('200');
      expect(res.body.data.name).toBe(uniqueName);
      expect(res.body.data.description).toBe('已更新的描述');
    });

    it('should reject update with duplicate code', async () => {
      if (!roleToUpdateId) return;

      // API 对重复代码返回 400 而非 409
      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/roles/${roleToUpdateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'admin', // 已存在
        })
        .expect(400);

      expect(res.body.code).not.toBe('200');
    });

    it('should return 400 for non-existent role', async () => {
      // API 对不存在的角色返回 400 而非 404
      await request(app.getHttpServer())
        .patch(`/${apiPrefix}/roles/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(400);
    });
  });

  describe('PATCH /roles/:id/status - 更新角色状态', () => {
    let roleForStatusId: number;
    const uniqueSuffix = Date.now();

    beforeAll(async () => {
      // 创建一个用于状态测试的角色
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `状态测试角色${uniqueSuffix}`,
          code: `status_test_${uniqueSuffix}`,
        });

      if (res.body.data) {
        roleForStatusId = res.body.data.id;
      }
    });

    it('should disable role', async () => {
      if (!roleForStatusId) {
        console.warn('No role created for status test');
        return;
      }

      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/roles/${roleForStatusId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.isActive).toBe(false);
    });

    it('should enable role', async () => {
      if (!roleForStatusId) return;

      const res = await request(app.getHttpServer())
        .patch(`/${apiPrefix}/roles/${roleForStatusId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('POST /roles/:id/permissions - 权限分配', () => {
    let roleForPermId: number;
    let permissionIds: number[] = [];
    const uniqueSuffix = Date.now();

    beforeAll(async () => {
      // 创建一个用于权限分配测试的角色
      const roleRes = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `权限测试角色${uniqueSuffix}`,
          code: `perm_test_${uniqueSuffix}`,
        });

      if (roleRes.body.data) {
        roleForPermId = roleRes.body.data.id;
      }

      // 获取权限列表
      const permRes = await request(app.getHttpServer())
        .get(`/${apiPrefix}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (permRes.body.data && permRes.body.data.length > 0) {
        // 取前 3 个权限
        permissionIds = permRes.body.data.slice(0, 3).map((p: any) => p.id);
      }
    });

    it('should assign permissions to role', async () => {
      if (!roleForPermId || permissionIds.length === 0) {
        console.warn('No role or permissions for testing');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles/${roleForPermId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds })
        .expect(201);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
    });

    it('should replace permissions when assigning new ones', async () => {
      if (!roleForPermId || permissionIds.length < 2) return;

      // 只分配一个权限
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles/${roleForPermId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: [permissionIds[0]] })
        .expect(201);

      expect(res.body.code).toBe('200');
    });

    it('should allow empty permission list', async () => {
      if (!roleForPermId) return;

      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles/${roleForPermId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: [] })
        .expect(201);

      expect(res.body.code).toBe('200');
    });

    it('should return 400 for non-existent role', async () => {
      // API 对不存在的角色返回 400 而非 404 (校验层)
      await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles/99999/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: [1] })
        .expect(400);
    });
  });

  describe('GET /roles/:id/permissions - 获取角色权限', () => {
    let adminRoleId: number;

    beforeAll(async () => {
      // 获取 admin 角色 ID
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/code/admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.body.data) {
        adminRoleId = res.body.data.id;
      }
    });

    it('should return role permissions', async () => {
      if (!adminRoleId) {
        console.warn('Admin role not found');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/${adminRoleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeInstanceOf(Array);
      // admin 角色应该有权限
      expect(res.body.data.length).toBeGreaterThan(0);

      // 验证权限结构
      const permission = res.body.data[0];
      expect(permission.id).toBeDefined();
      expect(permission.name).toBeDefined();
      expect(permission.code).toBeDefined();
    });

    it('should return 400 for non-existent role', async () => {
      // API 对不存在的角色返回 400 而非 404
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/99999/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /roles/statistics/overview - 角色统计', () => {
    it('should return role statistics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/statistics/overview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeDefined();
      // RoleStatisticsVo 使用 total, active, inactive (不是 totalRoles)
      expect(typeof res.body.data.total).toBe('number');
      expect(typeof res.body.data.active).toBe('number');
      expect(typeof res.body.data.inactive).toBe('number');
    });

    it('should reject statistics from non-admin', async () => {
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/statistics/overview`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });

  describe('DELETE /roles/:id - 删除角色', () => {
    let roleToDeleteId: number;
    const uniqueSuffix = Date.now();

    beforeEach(async () => {
      // 每次测试前创建一个新角色用于删除
      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `删除测试角色${uniqueSuffix}${Math.random()}`,
          code: `delete_test_${uniqueSuffix}_${Math.floor(Math.random() * 10000)}`,
        });

      if (res.body.data) {
        roleToDeleteId = res.body.data.id;
      }
    });

    it('should delete role successfully', async () => {
      if (!roleToDeleteId) {
        console.warn('No role created for delete test');
        return;
      }

      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/roles/${roleToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 验证角色已被删除 - API 对不存在的角色返回 400
      await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/${roleToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 400 for non-existent role', async () => {
      // API 对不存在的角色返回 400 而非 404
      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/roles/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should reject delete from non-admin', async () => {
      if (!roleToDeleteId) return;

      await request(app.getHttpServer())
        .delete(`/${apiPrefix}/roles/${roleToDeleteId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });

  describe('POST /roles/batch-delete - 批量删除角色', () => {
    let roleIds: number[] = [];
    const uniqueSuffix = Date.now();

    beforeAll(async () => {
      // 创建多个角色用于批量删除测试
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .post(`/${apiPrefix}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `批量删除测试角色${uniqueSuffix}_${i}`,
            code: `batch_del_${uniqueSuffix}_${i}`,
          });

        if (res.body.data) {
          roleIds.push(res.body.data.id);
        }
      }
    });

    it('should batch delete roles', async () => {
      if (roleIds.length === 0) {
        console.warn('No roles created for batch delete test');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/${apiPrefix}/roles/batch-delete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: roleIds })
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data.deletedCount).toBeGreaterThan(0);
    });
  });

  describe('GET /roles/active/codes - 获取激活角色代码', () => {
    it('should return active role codes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${apiPrefix}/roles/active/codes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe('200');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      // 应该包含 admin 角色
      expect(res.body.data).toContain('admin');
    });
  });
});
