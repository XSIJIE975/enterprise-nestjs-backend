import { PrismaClient } from '@/prisma/prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充种子数据...');

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

  console.log('✅ 已创建默认角色');

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
        assignedBy: 1, // 系统自动分配
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
        assignedBy: 1, // 系统自动分配
      },
    });
  }

  console.log('✅ 已分配角色权限');

  // 创建默认管理员用户
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
