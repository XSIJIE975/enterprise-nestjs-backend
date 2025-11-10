/**
 * 模板引擎类型枚举
 */
export type TemplateEngineType = 'MOCKJS' | 'JSON' | 'HANDLEBARS';

import { IMockContext } from '../interfaces/mock-context.interface';

/**
 * 模板引擎抽象基类
 *
 * 所有模板引擎必须继承此类并实现 render 方法
 */
export abstract class BaseEngine {
  /** 模板引擎名称 */
  abstract readonly name: TemplateEngineType;

  /**
   * 渲染模板
   *
   * @param template - 模板字符串 (格式取决于具体引擎)
   * @param context - Mock 上下文对象 (包含请求参数、查询参数、Body 等)
   * @returns Promise<unknown> - 渲染后的数据对象
   * @throws Error - 模板渲染失败时抛出异常
   */
  abstract render(template: string, context: IMockContext): Promise<unknown>;
}
