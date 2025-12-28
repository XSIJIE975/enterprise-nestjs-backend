/**
 * Mock 上下文接口
 * 包含处理 Mock 请求时的所有上下文信息
 */
export interface IMockContext {
  /** 路径参数 (如 /users/:id 中的 { id: '123' }) */
  params: Record<string, any>;

  /** Query 查询参数 (如 ?page=1&size=10) */
  query: Record<string, any>;

  /** 请求 Body 数据 */
  body: any;

  /** 请求头信息 (可选) */
  headers?: Record<string, string>;

  /** 原始请求对象 (可选, 供模板引擎获取额外信息) */
  request?: any;

  /** 请求 ID (可选, 用于日志追踪) */
  requestId?: string;

  /** 用户 ID (可选, 用于用户相关的 Mock 数据) */
  userId?: string | null;
}
