/**
 * Mock 调用日志接口
 * 记录每次 Mock 接口调用的详细信息
 */
export interface IMockLogEntry {
  /** 日志 ID (可选, 由数据库自动生成) */
  id?: string;

  /** 关联的 Mock 端点 ID (可选) */
  endpointId?: string | null;

  /** HTTP 请求方法 */
  method: string;

  /** 请求路径 (完整路径, 包含前缀) */
  path: string;

  /** Query 查询参数 (可选) */
  query?: Record<string, any> | null;

  /** 请求 Body 数据 (可选) */
  body?: any | null;

  /** 请求头信息 (可选, 部分记录) */
  headers?: Record<string, any> | null;

  /** 客户端 IP 地址 (可选) */
  ip?: string | null;

  /** 响应数据 (可选) */
  response?: any | null;

  /** HTTP 响应状态码 */
  statusCode: number;

  /** 请求处理时长 (毫秒, 可选) */
  duration?: number;

  /** 是否命中缓存 (可选, 默认 false) */
  cacheHit?: boolean;

  /** 日志创建时间 (可选, 由数据库自动生成) */
  createdAt?: Date;
}
