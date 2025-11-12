import * as Mock from 'mockjs';
import { createHash } from 'crypto';
import { VM } from 'vm2';
import { cloneDeep } from 'lodash-es';
import { BaseEngine, TemplateEngineType } from './base.engine';
import { IMockContext } from '../interfaces/mock-context.interface';

/**
 * MockJS 模板引擎实现
 *
 * 安全特性:
 * - 使用 vm2 沙箱隔离执行环境
 * - 设置 1 秒超时防止无限循环
 * - 只暴露必要的上下文数据 (params, query, body)
 * - 模板解析缓存,减少重复解析开销
 * - 限制缓存大小防止内存泄漏 (最多 500 个模板)
 *
 * 工作流程:
 * 1. 对模板字符串进行 SHA256 哈希
 * 2. 检查缓存,未命中则解析 JSON
 * 3. 在 vm2 沙箱中执行 Mock.mock()
 * 4. 返回生成的 Mock 数据
 */
export class MockJSEngine extends BaseEngine {
  readonly name: TemplateEngineType = 'MOCKJS';

  /** 模板缓存 Map, Key 为模板的 SHA256 哈希值 */
  private readonly templateCache = new Map<string, unknown>();

  /** 最大缓存数量,防止内存泄漏 */
  private readonly MAX_CACHE_SIZE = 500;

  /** 沙箱执行超时时间 (毫秒) */
  private readonly SANDBOX_TIMEOUT = 1000;

  /**
   * 生成模板的 SHA256 哈希值
   * @param template - 模板字符串
   * @returns 哈希值 (64 位十六进制字符串)
   */
  private hash(template: string): string {
    return createHash('sha256')
      .update(template || '')
      .digest('hex');
  }

  /**
   * 清理并只暴露安全的上下文数据
   * 防止模板访问敏感信息 (如 request 对象、headers 等)
   *
   * @param _context - 原始 Mock 上下文
   * @returns 清理后的安全上下文
   */
  private sanitizeContext(_context: IMockContext): Record<string, any> {
    // 使用 lodash cloneDeep 进行深拷贝,防止模板修改原始数据
    // 性能优于 JSON.parse(JSON.stringify()),且支持更多数据类型
    return {
      params: cloneDeep(_context?.params || {}),
      query: cloneDeep(_context?.query || {}),
      body: _context?.body ? cloneDeep(_context.body) : null,
    };
  }

  /**
   * 渲染 MockJS 模板
   *
   * @param template - MockJS 模板字符串 (JSON 格式)
   * @param _context - Mock 上下文对象
   * @returns Promise<unknown> - 生成的 Mock 数据
   * @throws Error - 模板解析或渲染失败时抛出异常
   */
  async render(template: string, _context: IMockContext): Promise<unknown> {
    const tpl = template || '{}';
    const key = this.hash(tpl);

    // 1. 检查模板缓存
    let parsed = this.templateCache.get(key);
    if (!parsed) {
      try {
        // 2. 解析 JSON 模板
        parsed = JSON.parse(tpl);
      } catch (err) {
        this.templateCache.delete(key);
        throw new Error(
          `MockJS 模板解析失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 3. 缓存解析后的模板
      this.templateCache.set(key, parsed);

      // 4. 限制缓存大小,防止内存泄漏
      if (this.templateCache.size > this.MAX_CACHE_SIZE) {
        // 删除最早的缓存项 (FIFO 策略)
        const firstKey = this.templateCache.keys().next().value;
        if (firstKey) {
          this.templateCache.delete(firstKey);
        }
      }
    }

    try {
      // 5. 在 vm2 沙箱中执行 Mock.mock()
      // 安全特性:
      // - timeout: 限制执行时间,防止恶意模板导致 DoS
      // - sandbox: 只暴露必要的对象,防止访问系统资源
      const vm = new VM({
        timeout: this.SANDBOX_TIMEOUT,
        sandbox: {
          Mock, // MockJS 库
          parsedTemplate: parsed, // 解析后的模板
          context: this.sanitizeContext(_context), // 清理后的上下文
        },
      });

      // 6. 执行模板渲染
      // 使用立即执行函数包装,避免污染全局作用域
      const res = vm.run(`(function(){ return Mock.mock(parsedTemplate); })()`);

      return res;
    } catch (err) {
      // 7. 捕获并包装错误信息
      const errorMessage = err instanceof Error ? err.message : String(err);

      // 检查是否是超时错误
      if (errorMessage.includes('Script execution timed out')) {
        throw new Error(
          `MockJS 模板执行超时 (${this.SANDBOX_TIMEOUT}ms), 请检查模板是否存在无限循环`,
        );
      }

      throw new Error(`MockJS 模板渲染失败: ${errorMessage}`);
    }
  }

  /**
   * 清空模板缓存
   * 用于内存管理或强制重新解析模板
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * 获取当前缓存统计信息
   * @returns 缓存统计对象
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.templateCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}
