import type { Prisma } from '@/prisma/prisma/client';

/**
 * 用户完整信息类型（包含角色关联）
 * 对应 findByUsernameOrEmail 等方法的返回类型
 */
export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true;
      };
    };
  };
}>;

/**
 * 认证用户类型（不含密码字段，但包含角色信息）
 * 用于登录验证后在应用内传递的用户信息
 */
export type AuthUser = Omit<UserWithRoles, 'password'>;

/**
 * JWT 令牌中的用户基本信息
 * 只包含必要的标识和权限信息
 */
export type JwtUserPayload = {
  userId: number;
  username: string;
  email: string;
  roles: string[];
  permissions?: string[];
};
