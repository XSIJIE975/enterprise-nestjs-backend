import {
  PrismaClient,
  HttpMethod,
  TemplateEngine,
} from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充种子数据...');

  // 创建 Mock 数据
  console.log('🎭 创建 Mock 数据...');
  const mockEndpoints = [
    {
      name: '模拟用户列表',
      description: '返回随机生成的用户列表数据',
      path: '/users',
      method: HttpMethod.GET,
      enabled: true,
      statusCode: 200,
      delay: 500,
      templateEngine: TemplateEngine.MOCKJS,
      responseTemplate: JSON.stringify({
        code: 200,
        message: 'success',
        'data|10': [
          {
            'id|+1': 1,
            username: '@word(5, 10)',
            email: '@email',
            'role|1': ['user', 'admin', 'editor'],
            'status|1': ['active', 'inactive'],
            createdAt: '@datetime',
            profile: {
              avatar: '@image("200x200", "#50B347", "#FFF", "Mock")',
              'age|18-60': 1,
              bio: '@sentence(10, 20)',
            },
          },
        ],
      }),
      headers: JSON.stringify({
        'Content-Type': 'application/json',
        'X-Mock-By': 'NestJS-Enterprise',
      }),
    },
    {
      name: '模拟登录成功',
      description: '模拟用户登录成功的响应',
      path: '/auth/login',
      method: HttpMethod.POST,
      enabled: true,
      statusCode: 200,
      delay: 200,
      templateEngine: TemplateEngine.JSON,
      responseTemplate: JSON.stringify({
        code: 200,
        message: '登录成功',
        data: {
          accessToken:
            'mock_access_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken:
            'mock_refresh_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresIn: 3600,
          user: {
            id: 'user_123456',
            username: 'mock_user',
            roles: ['user'],
          },
        },
      }),
    },
    {
      name: '模拟服务器错误',
      description: '模拟 500 内部服务器错误',
      path: '/errors/500',
      method: HttpMethod.GET,
      enabled: true,
      statusCode: 500,
      delay: 0,
      templateEngine: TemplateEngine.JSON,
      responseTemplate: JSON.stringify({
        code: 500,
        message: 'Internal Server Error',
        error: 'Unexpected database connection error',
        timestamp: new Date().toISOString(),
      }),
    },
    {
      name: '模拟动态数据',
      description: '使用 Mock.js 生成动态数值和布尔值',
      path: '/dashboard/stats',
      method: HttpMethod.GET,
      enabled: true,
      statusCode: 200,
      delay: 100,
      templateEngine: TemplateEngine.MOCKJS,
      responseTemplate: JSON.stringify({
        code: 200,
        message: 'success',
        data: {
          'totalUsers|1000-5000': 1,
          'activeUsers|100-500': 1,
          'revenue|10000-50000.2': 1,
          systemStatus: {
            'cpu|1-100': 1,
            'memory|1-100': 1,
            'disk|1-100': 1,
            'healthy|1-2': true,
          },
          'recentActivity|5': [
            {
              'id|+1': 100,
              action:
                '@pick(["login", "logout", "update_profile", "view_report"])',
              ip: '@ip',
              time: '@now',
            },
          ],
        },
      }),
    },
  ];

  for (const endpoint of mockEndpoints) {
    await prisma.mockEndpoint.upsert({
      where: {
        unique_path_method: {
          path: endpoint.path,
          method: endpoint.method,
        },
      },
      update: endpoint,
      create: endpoint,
    });
  }
  console.log(`✅ 已创建 ${mockEndpoints.length} 个 Mock 端点`);

  // 创建默认权限
  console.log('📝 创建默认权限...');
  const permissions = await Promise.all([
    // 用户管理权限
    prisma.permission.upsert({
      where: { code: 'user:read' },
      update: {},
      create: {
        name: '查看用户',
        code: 'user:read',
        resource: 'user',
        action: 'read',
        description: '查看用户信息的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user:create' },
      update: {},
      create: {
        name: '创建用户',
        code: 'user:create',
        resource: 'user',
        action: 'create',
        description: '创建新用户的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user:update' },
      update: {},
      create: {
        name: '更新用户',
        code: 'user:update',
        resource: 'user',
        action: 'update',
        description: '更新用户信息的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user:delete' },
      update: {},
      create: {
        name: '删除用户',
        code: 'user:delete',
        resource: 'user',
        action: 'delete',
        description: '删除用户的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user_session:list' },
      update: {},
      create: {
        name: '查看用户会话',
        code: 'user_session:list',
        resource: 'user_session',
        action: 'list',
        description: '查看指定用户会话列表的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'user_session:revoke' },
      update: {},
      create: {
        name: '注销用户会话',
        code: 'user_session:revoke',
        resource: 'user_session',
        action: 'revoke',
        description: '注销指定用户指定会话的权限',
      },
    }),
    // 角色管理权限
    prisma.permission.upsert({
      where: { code: 'role:read' },
      update: {},
      create: {
        name: '查看角色',
        code: 'role:read',
        resource: 'role',
        action: 'read',
        description: '查看角色信息的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'role:create' },
      update: {},
      create: {
        name: '创建角色',
        code: 'role:create',
        resource: 'role',
        action: 'create',
        description: '创建新角色的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'role:update' },
      update: {},
      create: {
        name: '更新角色',
        code: 'role:update',
        resource: 'role',
        action: 'update',
        description: '更新角色信息的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'role:delete' },
      update: {},
      create: {
        name: '删除角色',
        code: 'role:delete',
        resource: 'role',
        action: 'delete',
        description: '删除角色的权限',
      },
    }),
    // 系统管理权限
    prisma.permission.upsert({
      where: { code: 'system:admin' },
      update: {},
      create: {
        name: '系统管理',
        code: 'system:admin',
        resource: 'system',
        action: 'admin',
        description: '系统管理员权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'system:config' },
      update: {},
      create: {
        name: '系统配置',
        code: 'system:config',
        resource: 'system',
        action: 'config',
        description: '系统配置管理权限',
      },
    }),
    // 权限管理权限
    prisma.permission.upsert({
      where: { code: 'permission:read' },
      update: {},
      create: {
        name: '查看权限',
        code: 'permission:read',
        resource: 'permission',
        action: 'read',
        description: '查看权限信息的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'permission:create' },
      update: {},
      create: {
        name: '创建权限',
        code: 'permission:create',
        resource: 'permission',
        action: 'create',
        description: '创建新权限的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'permission:update' },
      update: {},
      create: {
        name: '更新权限',
        code: 'permission:update',
        resource: 'permission',
        action: 'update',
        description: '更新权限信息的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'permission:delete' },
      update: {},
      create: {
        name: '删除权限',
        code: 'permission:delete',
        resource: 'permission',
        action: 'delete',
        description: '删除权限的权限',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'permission:manage' },
      update: {},
      create: {
        name: '权限管理',
        code: 'permission:manage',
        resource: 'permission',
        action: 'manage',
        description: '权限管理的综合权限（包含状态管理等）',
      },
    }),
  ]);

  console.log(`✅ 已创建 ${permissions.length} 个权限`);

  // 创建默认角色
  console.log('👥 创建默认角色...');
  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'admin',
      description: '系统超级管理员，拥有所有权限',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { code: 'user' },
    update: {},
    create: {
      name: '普通用户',
      code: 'user',
      description: '普通用户角色',
    },
  });

  // 创建测试角色
  const contentManagerRole = await prisma.role.upsert({
    where: { code: 'content_manager' },
    update: {},
    create: {
      name: '内容管理员',
      code: 'content_manager',
      description: '负责内容管理和审核的角色',
    },
  });

  const financeManagerRole = await prisma.role.upsert({
    where: { code: 'finance_manager' },
    update: {},
    create: {
      name: '财务管理员',
      code: 'finance_manager',
      description: '负责财务管理和报表的角色',
    },
  });

  const auditorRole = await prisma.role.upsert({
    where: { code: 'auditor' },
    update: {},
    create: {
      name: '审计员',
      code: 'auditor',
      description: '负责系统审计和监控的角色',
    },
  });

  console.log('✅ 已创建默认角色');

  // 创建默认管理员用户（需要在分配权限前创建，以便使用其 ID）
  console.log('👤 创建默认管理员用户...');
  const hashedPassword = await bcrypt.hash('admin123456', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@enterprise.local' },
    update: {},
    create: {
      email: 'admin@enterprise.local',
      username: 'admin',
      password: hashedPassword,
      firstName: '系统',
      lastName: '管理员',
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✅ 已创建默认管理员用户');

  // 为管理员角色分配所有权限
  console.log('🔐 分配角色权限...');
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
        assignedBy: adminUser.id, // 使用管理员用户ID
      },
    });
  }

  // 为普通用户角色分配基础权限
  const userPermissions = permissions.filter(
    p => p.code === 'user:read' || p.code === 'user:update',
  );

  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: permission.id,
        assignedBy: adminUser.id, // 使用管理员用户ID
      },
    });
  }

  // 为内容管理员角色分配权限
  const contentPermissions = permissions.filter(
    p => p.code.startsWith('user:') || p.code.startsWith('permission:read'),
  );

  for (const permission of contentPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: contentManagerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: contentManagerRole.id,
        permissionId: permission.id,
        assignedBy: adminUser.id,
      },
    });
  }

  // 为财务管理员角色分配权限
  const financePermissions = permissions.filter(
    p => p.code.startsWith('user:') || p.code === 'system:config',
  );

  for (const permission of financePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: financeManagerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: financeManagerRole.id,
        permissionId: permission.id,
        assignedBy: adminUser.id,
      },
    });
  }

  // 为审计员角色分配只读权限
  const auditPermissions = permissions.filter(
    p => p.action === 'read' || p.code === 'system:admin',
  );

  for (const permission of auditPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: auditorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: auditorRole.id,
        permissionId: permission.id,
        assignedBy: adminUser.id,
      },
    });
  }

  console.log('✅ 已分配角色权限');

  // 为管理员用户分配管理员角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id,
    },
  });

  console.log('✅ 已创建默认管理员用户');

  // 创建测试用户
  console.log('👤 创建测试用户...');
  const testUserPassword = await bcrypt.hash('test123456', 12);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@enterprise.local' },
    update: {},
    create: {
      email: 'test@enterprise.local',
      username: 'testuser',
      password: testUserPassword,
      firstName: '测试',
      lastName: '用户',
      isActive: true,
      isVerified: true,
    },
  });

  // 为测试用户分配普通用户角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: testUser.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      roleId: userRole.id,
      assignedBy: adminUser.id,
    },
  });

  console.log('✅ 已创建测试用户');

  // 创建系统配置
  console.log('⚙️ 创建系统配置...');
  const systemConfigs = [
    {
      key: 'system.name',
      value: 'Enterprise NestJS Backend',
      description: '系统名称',
      type: 'string',
      isPublic: true,
    },
    {
      key: 'system.version',
      value: '1.0.0',
      description: '系统版本',
      type: 'string',
      isPublic: true,
    },
    {
      key: 'auth.max_login_attempts',
      value: '5',
      description: '最大登录尝试次数',
      type: 'number',
      isPublic: false,
    },
    {
      key: 'auth.lockout_duration',
      value: '300',
      description: '账户锁定时长（秒）',
      type: 'number',
      isPublic: false,
    },
    {
      key: 'file.max_upload_size',
      value: '10485760',
      description: '最大文件上传大小（字节）',
      type: 'number',
      isPublic: false,
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log(`✅ 已创建 ${systemConfigs.length} 个系统配置`);

  console.log('🎉 种子数据填充完成！');
  console.log('');
  console.log('📋 默认账户信息：');
  console.log('管理员账户：');
  console.log('  邮箱：admin@enterprise.local');
  console.log('  密码：admin123456');
  console.log('');
  console.log('测试账户：');
  console.log('  邮箱：test@enterprise.local');
  console.log('  密码：test123456');
}

main()
  .catch(e => {
    console.error('❌ 种子数据填充失败：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
