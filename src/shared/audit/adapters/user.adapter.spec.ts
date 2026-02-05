/**
 * UserAdapter 单元测试
 * 验证用户资源适配器的功能
 */

import { UserAdapter } from './user.adapter';

describe('UserAdapter', () => {
  let adapter: UserAdapter;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    adapter = new UserAdapter(mockPrisma);
  });

  describe('resource getter', () => {
    it('should return AuditResource.user', () => {
      expect(adapter.resource).toBe('user');
    });
  });

  describe('findById', () => {
    it('should return user with roleIds but WITHOUT password', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        avatar: null,
        isActive: true,
        isVerified: true,
        userRoles: [{ role: { id: 1 } }, { role: { id: 2 } }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.findById('user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.phone).toBe('1234567890');
      expect(result.avatar).toBeNull();
      expect(result.isActive).toBe(true);
      expect(result.isVerified).toBe(true);
      expect(result.roleIds).toEqual([1, 2]);

      // 关键验证：密码和 refreshToken 不存在
      expect(result.password).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await adapter.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle user with empty roleIds', async () => {
      const mockUser = {
        id: 'user-2',
        username: 'noroles',
        email: 'noroles@example.com',
        firstName: 'No',
        lastName: 'Roles',
        phone: null,
        avatar: 'https://example.com/avatar.jpg',
        isActive: true,
        isVerified: false,
        userRoles: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.findById('user-2');

      expect(result.roleIds).toEqual([]);
      expect(result.isVerified).toBe(false);
    });

    it('should convert numeric id to string', async () => {
      const mockUser = {
        id: 'user-3',
        username: 'numeric',
        email: 'numeric@example.com',
        firstName: 'Num',
        lastName: 'Eric',
        phone: null,
        avatar: null,
        isActive: true,
        isVerified: true,
        userRoles: [{ role: { id: 5 } }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await adapter.findById(123); // 传入数字

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        select: expect.any(Object),
      });
    });

    it('should use correct Prisma select structure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await adapter.findById('user-1');

      const callArgs = mockPrisma.user.findUnique.mock.calls[0][0];
      expect(callArgs.select).toEqual({
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        userRoles: {
          select: {
            role: {
              select: { id: true },
            },
          },
        },
      });
      // 确保 select 中不包含 password 或 refreshToken
      expect(callArgs.select.password).toBeUndefined();
      expect(callArgs.select.refreshToken).toBeUndefined();
    });
  });

  describe('findByIds', () => {
    it('should return multiple users with roleIds', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          phone: '1111111111',
          avatar: null,
          isActive: true,
          isVerified: true,
          userRoles: [{ role: { id: 1 } }, { role: { id: 2 } }],
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          phone: '2222222222',
          avatar: 'url',
          isActive: false,
          isVerified: false,
          userRoles: [{ role: { id: 3 } }],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await adapter.findByIds(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
      expect(result[0].roleIds).toEqual([1, 2]);
      expect(result[1].roleIds).toEqual([3]);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(false);

      // 验证敏感字段不存在
      result.forEach(user => {
        expect(user.password).toBeUndefined();
        expect(user.refreshToken).toBeUndefined();
      });
    });

    it('should return empty array for empty ids', async () => {
      const result = await adapter.findByIds([]);

      expect(result).toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should convert numeric ids to strings', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await adapter.findByIds([123, 456]);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['123', '456'] },
        },
        select: expect.any(Object),
      });
    });

    it('should handle users with no roles', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'noroles1',
          email: 'noroles1@example.com',
          firstName: 'No',
          lastName: 'Roles1',
          phone: null,
          avatar: null,
          isActive: true,
          isVerified: false,
          userRoles: [],
        },
        {
          id: 'user-2',
          username: 'noroles2',
          email: 'noroles2@example.com',
          firstName: 'No',
          lastName: 'Roles2',
          phone: null,
          avatar: null,
          isActive: true,
          isVerified: true,
          userRoles: [],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await adapter.findByIds(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
      expect(result[0].roleIds).toEqual([]);
      expect(result[1].roleIds).toEqual([]);
    });

    it('should use correct Prisma select structure for findMany', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await adapter.findByIds(['user-1']);

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.select).toEqual({
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        userRoles: {
          select: {
            role: {
              select: { id: true },
            },
          },
        },
      });
      // 确保 select 中不包含 password 或 refreshToken
      expect(callArgs.select.password).toBeUndefined();
      expect(callArgs.select.refreshToken).toBeUndefined();
    });
  });

  describe('Security - Sensitive Fields', () => {
    it('should never include password in findById result', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatar: null,
        isActive: true,
        isVerified: true,
        userRoles: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.findById('user-1');

      expect(Object.keys(result)).not.toContain('password');
    });

    it('should never include refreshToken in findById result', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatar: null,
        isActive: true,
        isVerified: true,
        userRoles: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adapter.findById('user-1');

      expect(Object.keys(result)).not.toContain('refreshToken');
    });

    it('should never include password in findByIds result', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'test1',
          email: 'test1@example.com',
          firstName: 'Test',
          lastName: 'One',
          phone: null,
          avatar: null,
          isActive: true,
          isVerified: true,
          userRoles: [],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await adapter.findByIds(['user-1']);

      result.forEach(user => {
        expect(Object.keys(user)).not.toContain('password');
      });
    });

    it('should never include refreshToken in findByIds result', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'test1',
          email: 'test1@example.com',
          firstName: 'Test',
          lastName: 'One',
          phone: null,
          avatar: null,
          isActive: true,
          isVerified: true,
          userRoles: [],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await adapter.findByIds(['user-1']);

      result.forEach(user => {
        expect(Object.keys(user)).not.toContain('refreshToken');
      });
    });
  });
});
