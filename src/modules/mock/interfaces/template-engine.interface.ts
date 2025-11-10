import { IMockContext } from './mock-context.interface';

/**
 * 模板引擎接口
 * 定义所有模板引擎必须实现的方法
 */
export interface ITemplateEngine {
  /**
   * 渲染模板
   * @param template - 模板字符串 (如 JSON 字符串、MockJS 模板等)
   * @param context - Mock 上下文对象 (包含请求信息)
   * @returns Promise<unknown> - 渲染后的数据对象
   */
  render(template: string, context: IMockContext): Promise<unknown>;

  /**
   * 编译模板 (可选)
   * @param template - 模板字符串
   * @returns unknown - 编译后的模板对象
   */
  compile?(template: string): unknown;
}
