/**
 * 模板引擎类型
 */
export type TemplateEngineType = 'MOCKJS' | 'JSON' | 'HANDLEBARS';

/**
 * Mock 端点接口
 * 定义 Mock 端点的完整数据结构
 */
export interface IMockEndpoint {
  /** Mock 端点唯一标识 */
  id: string;

  /** Mock 端点名称 */
  name: string;

  /** Mock 端点路径 (支持动态参数, 如 /users/:id) */
  path: string;

  /** HTTP 请求方法 ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL') */
  method: string;

  /** 是否启用此 Mock 端点 */
  enabled: boolean;

  /** HTTP 响应状态码 (100-599) */
  statusCode: number;

  /** 响应延迟时间 (毫秒, 0-10000) */
  delay: number;

  /** 响应模板 (序列化的 JSON/文本模板) */
  responseTemplate: string;

  /** 使用的模板引擎类型 */
  templateEngine: TemplateEngineType;

  /** 自定义响应头 (支持字符串和对象, 数据库存储为字符串) */
  headers?: Record<string, string> | string;

  /** 请求参数校验规则 (JSON Schema 格式) */
  validation?: any;

  /** 版本号 (用于缓存失效) */
  version: number;

  /** Mock 端点描述 */
  description?: string;

  /** 创建人 */
  createdBy?: string;

  /** 创建时间 */
  createdAt?: Date;

  /** 更新时间 */
  updatedAt?: Date;
}
