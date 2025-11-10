import { BaseEngine, TemplateEngineType } from './base.engine';
import { IMockContext } from '../interfaces/mock-context.interface';

/**
 * JSON 模板引擎实现
 *
 * 功能说明:
 * - 直接解析 JSON 字符串并返回对象
 * - 不支持动态数据生成 (静态 Mock 数据)
 * - 不使用上下文信息
 *
 * 使用场景:
 * - 固定的 Mock 响应数据
 * - 不需要随机生成的场景
 * - 简单的静态数据返回
 */
export class JsonEngine extends BaseEngine {
  readonly name: TemplateEngineType = 'JSON';

  /**
   * 渲染 JSON 模板
   *
   * @param template - JSON 字符串
   * @param _context - Mock 上下文 (未使用)
   * @returns Promise<unknown> - 解析后的 JSON 对象
   * @throws Error - JSON 解析失败时抛出异常
   */
  async render(template: string, _context: IMockContext): Promise<unknown> {
    const tpl = template || '';

    // 空模板返回 null
    if (!tpl) {
      return null;
    }

    try {
      // 解析 JSON 字符串
      return JSON.parse(tpl);
    } catch (err) {
      // 解析失败抛出友好的错误信息
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`JSON 模板解析失败: ${errorMessage}`);
    }
  }
}
