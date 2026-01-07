/**
 * JWT Payload 接口
 */
export interface AuthJwtPayload {
  /**
   * 用户 ID（JWT 标准字段 sub）- UUID 格式
   */
  sub: string;

  /**
   * 用户名
   */
  username: string;

  /**
   * 邮箱
   */
  email: string;

  /**
   * 用户角色代码列表
   */
  roles: string[];

  /**
   * 用户权限代码列表（基于角色聚合）
   */
  permissions: string[];

  /**
   * 签发时间（JWT 标准字段）
   */
  iat?: number;

  /**
   * 过期时间（JWT 标准字段）
   */
  exp?: number;

  /**
   * 签发者（JWT 标准字段）
   */
  iss?: string;

  /**
   * 受众（JWT 标准字段）
   */
  aud?: string;
}

/**
 * JWT 验证后的用户信息
 */
export interface JwtUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}
