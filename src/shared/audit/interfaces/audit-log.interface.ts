/**
 * 审计日志相关接口定义
 * 用于审计日志装饰器和服务的类型约束
 */

import { AuditAction, AuditResource } from '@/common/constants/audit.constants';

/**
 * 审计日志选项接口
 * 定义了 @AuditLog 装饰器的配置参数
 */
export interface IAuditLogOptions {
  /**
   * 审计操作类型
   * 例如: CREATE, UPDATE, DELETE
   */
  action: AuditAction;

  /**
   * 审计资源类型
   * 例如: role, permission, user
   */
  resource: AuditResource;

  /**
   * 资源ID在方法参数中的位置（按索引）
   * 例如: 0 表示资源ID是第一个参数
   * 可选，如果指定了 resourceIdPath 则不需要
   */
  resourceIdArg?: number;

  /**
   * 资源ID在参数对象中的路径（点符号）
   * 例如: 'dto.id' 或 'params.userId'
   * 可选，如果指定了 resourceIdArg 则不需要
   */
  resourceIdPath?: string;

  /**
   * 资源ID在方法返回值中的路径（点符号）
   * 用于 CREATE 等操作，返回值中包含新创建资源的ID
   * 例如: 'data.id' 或 'id'
   * 可选
   */
  resourceIdFromResult?: string;

  /**
   * 是否为批量操作
   * 为 true 时表示本次操作涉及多个资源ID
   * 默认 false
   */
  batch?: boolean;

  /**
   * 条件判断函数
   * 根据方法参数、返回值和执行上下文判断是否需要记录审计日志
   * @param args - 方法参数数组
   * @param result - 方法返回值
   * @param context - 方法执行上下文（this）
   * @returns true 表示需要记录，false 表示不记录
   * 例如: (args, result, context) => result.success === true
   * 可选，默认总是记录
   */
  condition?: (args: any[], result: any, context: any) => boolean;
}

/**
 * 资源适配器接口
 * 定义了审计服务查询资源的标准契约
 * 实现类应提供具体资源类型的查询逻辑
 */
export interface IResourceAdapter {
  /**
   * 该适配器处理的资源类型
   */
  resource: AuditResource;

  /**
   * 根据ID查询单个资源
   * @param id 资源ID
   * @returns 资源对象，如果不存在返回 null/undefined
   */
  findById(id: string | number): Promise<any>;

  /**
   * 根据多个ID查询资源（批量）
   * @param ids 资源ID数组
   * @returns 资源对象数组
   */
  findByIds(ids: (string | number)[]): Promise<any[]>;
}

/**
 * 审计执行上下文接口
 * 封装审计日志记录过程中的运行时信息
 * 用于在装饰器和服务之间传递审计相关数据
 */
export interface IAuditContext {
  /**
   * 审计操作类型
   */
  action: AuditAction;

  /**
   * 审计资源类型
   */
  resource: AuditResource;

  /**
   * 资源ID或ID数组
   * 如果是批量操作，此处为ID数组
   */
  resourceId?: string | number | (string | number)[];

  /**
   * 被审计方法的参数列表
   */
  methodArgs?: any[];

  /**
   * 被审计方法的返回值
   */
  methodResult?: any;

  /**
   * 是否为批量操作
   */
  isBatch?: boolean;

  /**
   * 方法执行开始时间戳（毫秒）
   */
  startTime?: number;

  /**
   * 方法执行耗时（毫秒）
   */
  executionTime?: number;
}
