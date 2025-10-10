/**
 * JWT Payload 接口
 */
export interface JwtPayload {
  /**
   * 用户 ID（JWT 标准字段 sub）
   */
  sub: number;

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
  userId: number;
  username: string;
  email: string;
  roles: string[];
}
