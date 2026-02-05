/**
 * ResourceAdapterRegistry 单元测试
 * 测试注册表的基础功能：注册、获取和错误处理
 */

import { ResourceAdapterRegistry } from './resource-adapter.registry';
import { AuditResource } from '@/common/constants/audit.constants';
import { IResourceAdapter } from './interfaces/audit-log.interface';

/**
 * 模拟的资源适配器实现
 */
class MockUserAdapter implements IResourceAdapter {
  resource = AuditResource.user;

  async findById(id: string | number): Promise<any> {
    return { id, name: `User ${id}` };
  }

  async findByIds(ids: (string | number)[]): Promise<any[]> {
    return ids.map(id => ({ id, name: `User ${id}` }));
  }
}

/**
 * 模拟的角色适配器实现
 */
class MockRoleAdapter implements IResourceAdapter {
  resource = AuditResource.role;

  async findById(id: string | number): Promise<any> {
    return { id, name: `Role ${id}` };
  }

  async findByIds(ids: (string | number)[]): Promise<any[]> {
    return ids.map(id => ({ id, name: `Role ${id}` }));
  }
}

/**
 * 模拟的权限适配器实现
 */
class MockPermissionAdapter implements IResourceAdapter {
  resource = AuditResource.permission;

  async findById(id: string | number): Promise<any> {
    return { id, name: `Permission ${id}` };
  }

  async findByIds(ids: (string | number)[]): Promise<any[]> {
    return ids.map(id => ({ id, name: `Permission ${id}` }));
  }
}

describe('ResourceAdapterRegistry', () => {
  let registry: ResourceAdapterRegistry;

  beforeEach(() => {
    registry = new ResourceAdapterRegistry();
  });

  describe('register', () => {
    it('应该成功注册单个适配器', () => {
      const adapter = new MockUserAdapter();
      expect(() => registry.register(adapter)).not.toThrow();
    });

    it('应该成功注册多个不同资源类型的适配器', () => {
      const userAdapter = new MockUserAdapter();
      const roleAdapter = new MockRoleAdapter();
      const permissionAdapter = new MockPermissionAdapter();

      expect(() => {
        registry.register(userAdapter);
        registry.register(roleAdapter);
        registry.register(permissionAdapter);
      }).not.toThrow();
    });

    it('应该允许覆盖已注册的适配器', () => {
      const adapter1 = new MockUserAdapter();
      const adapter2 = new MockUserAdapter();

      registry.register(adapter1);
      // 第二次注册应该覆盖而不是抛出错误
      expect(() => registry.register(adapter2)).not.toThrow();
    });
  });

  describe('getAdapter', () => {
    it('应该返回已注册的适配器', () => {
      const userAdapter = new MockUserAdapter();
      registry.register(userAdapter);

      const retrieved = registry.getAdapter(AuditResource.user);
      expect(retrieved).toBe(userAdapter);
      expect(retrieved.resource).toBe(AuditResource.user);
    });

    it('应该返回正确的适配器（多个适配器注册时）', () => {
      const userAdapter = new MockUserAdapter();
      const roleAdapter = new MockRoleAdapter();
      const permissionAdapter = new MockPermissionAdapter();

      registry.register(userAdapter);
      registry.register(roleAdapter);
      registry.register(permissionAdapter);

      expect(registry.getAdapter(AuditResource.user)).toBe(userAdapter);
      expect(registry.getAdapter(AuditResource.role)).toBe(roleAdapter);
      expect(registry.getAdapter(AuditResource.permission)).toBe(
        permissionAdapter,
      );
    });

    it('应该在未找到适配器时抛出错误', () => {
      expect(() => registry.getAdapter(AuditResource.user)).toThrow(
        `No adapter registered for resource: ${AuditResource.user}`,
      );
    });

    it('应该在未找到适配器时抛出特定的错误消息', () => {
      expect(() => registry.getAdapter(AuditResource.role)).toThrow(
        'No adapter registered for resource: role',
      );
    });

    it('应该在适配器被覆盖后返回新的适配器', () => {
      const adapter1 = new MockUserAdapter();
      const adapter2 = new MockUserAdapter();

      registry.register(adapter1);
      const retrieved1 = registry.getAdapter(AuditResource.user);
      expect(retrieved1).toBe(adapter1);

      registry.register(adapter2);
      const retrieved2 = registry.getAdapter(AuditResource.user);
      expect(retrieved2).toBe(adapter2);
      expect(retrieved2).not.toBe(adapter1);
    });
  });

  describe('适配器接口验证', () => {
    it('注册的适配器应该实现 IResourceAdapter 接口', async () => {
      const userAdapter = new MockUserAdapter();
      registry.register(userAdapter);

      const adapter = registry.getAdapter(AuditResource.user);

      // 验证适配器拥有必要的属性和方法
      expect(adapter).toHaveProperty('resource');
      expect(adapter).toHaveProperty('findById');
      expect(adapter).toHaveProperty('findByIds');
      expect(typeof adapter.findById).toBe('function');
      expect(typeof adapter.findByIds).toBe('function');
    });

    it('获取的适配器应该能正确执行 findById 方法', async () => {
      const userAdapter = new MockUserAdapter();
      registry.register(userAdapter);

      const adapter = registry.getAdapter(AuditResource.user);
      const result = await adapter.findById('123');

      expect(result).toEqual({ id: '123', name: 'User 123' });
    });

    it('获取的适配器应该能正确执行 findByIds 方法', async () => {
      const userAdapter = new MockUserAdapter();
      registry.register(userAdapter);

      const adapter = registry.getAdapter(AuditResource.user);
      const results = await adapter.findByIds(['1', '2', '3']);

      expect(results).toEqual([
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
        { id: '3', name: 'User 3' },
      ]);
    });
  });

  describe('边界情况', () => {
    it('应该处理空注册表的查询', () => {
      const emptyRegistry = new ResourceAdapterRegistry();
      expect(() => emptyRegistry.getAdapter(AuditResource.user)).toThrow();
    });

    it('应该正确处理所有 AuditResource 类型', () => {
      const adapters = [
        new MockUserAdapter(),
        new MockRoleAdapter(),
        new MockPermissionAdapter(),
      ];

      adapters.forEach(adapter => {
        registry.register(adapter);
      });

      // 验证所有已注册的资源类型都能被获取
      Object.values(AuditResource).forEach(resource => {
        expect(() => registry.getAdapter(resource)).not.toThrow();
      });
    });
  });
});
