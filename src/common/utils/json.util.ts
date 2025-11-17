/**
 * JSON 序列化/反序列化工具类
 *
 * 用于处理 MySQL 5.6 不支持原生 JSON 类型的兼容性问题
 * 将 JSON 数据序列化为字符串存储在 TEXT 字段中
 */
export class JsonUtil {
  /**
   * 序列化 JSON 数据为字符串
   *
   * @param data - 要序列化的数据对象
   * @param maxBytes - 最大字节数限制（TEXT 类型最大 65535 字节）
   * @returns 序列化后的 JSON 字符串，失败返回 null
   *
   * @example
   * ```typescript
   * const jsonStr = JsonUtil.serialize({ name: 'John', age: 30 });
   * // 返回: '{"name":"John","age":30}'
   * ```
   */
  static serialize(data: any, maxBytes: number = 65535): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    try {
      const jsonStr = JSON.stringify(data);

      // 检查字符串长度是否超过限制
      if (Buffer.byteLength(jsonStr, 'utf8') > maxBytes) {
        return this.truncateJson(jsonStr, maxBytes);
      }

      return jsonStr;
    } catch (error) {
      console.error('[JsonUtil] Failed to serialize JSON:', error);
      return null;
    }
  }

  /**
   * 反序列化 JSON 字符串为对象
   *
   * @param jsonStr - JSON 字符串
   * @returns 反序列化后的对象，失败返回 null
   *
   * @example
   * ```typescript
   * const data = JsonUtil.deserialize('{"name":"John","age":30}');
   * // 返回: { name: 'John', age: 30 }
   * ```
   */
  static deserialize<T = any>(jsonStr: string | null | undefined): T | null {
    if (!jsonStr || jsonStr.trim() === '') {
      return null;
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('[JsonUtil] Failed to deserialize JSON:', error);
      return null;
    }
  }

  /**
   * 批量序列化对象中的指定字段
   *
   * @param obj - 源对象
   * @param fields - 需要序列化的字段名数组
   * @returns 序列化后的新对象
   *
   * @example
   * ```typescript
   * const result = JsonUtil.serializeFields(
   *   { params: { page: 1 }, body: { name: 'John' }, other: 'value' },
   *   ['params', 'body']
   * );
   * // 返回: { params: '{"page":1}', body: '{"name":"John"}', other: 'value' }
   * ```
   */
  static serializeFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };

    for (const field of fields) {
      if (field in result && result[field] !== null) {
        result[field] = this.serialize(result[field]) as any;
      }
    }

    return result;
  }

  /**
   * 批量反序列化对象中的指定字段
   *
   * @param obj - 源对象
   * @param fields - 需要反序列化的字段名数组
   * @returns 反序列化后的新对象
   *
   * @example
   * ```typescript
   * const result = JsonUtil.deserializeFields(
   *   { params: '{"page":1}', body: '{"name":"John"}', other: 'value' },
   *   ['params', 'body']
   * );
   * // 返回: { params: { page: 1 }, body: { name: 'John' }, other: 'value' }
   * ```
   */
  static deserializeFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };

    for (const field of fields) {
      if (field in result && typeof result[field] === 'string') {
        result[field] = this.deserialize(result[field] as string) as any;
      }
    }

    return result;
  }

  /**
   * 安全地序列化，忽略循环引用
   *
   * @param data - 要序列化的数据
   * @param maxBytes - 最大字节数限制
   * @returns 序列化后的字符串
   */
  static serializeSafe(data: any, maxBytes: number = 65535): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    try {
      const seen = new WeakSet();
      const jsonStr = JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });

      if (Buffer.byteLength(jsonStr, 'utf8') > maxBytes) {
        return this.truncateJson(jsonStr, maxBytes);
      }

      return jsonStr;
    } catch (error) {
      console.error('[JsonUtil] Failed to serialize JSON safely:', error);
      return null;
    }
  }

  /**
   * 截断过长的 JSON 字符串
   *
   * @param jsonStr - 原始 JSON 字符串
   * @param maxBytes - 最大字节数
   * @returns 截断后的字符串
   */
  private static truncateJson(jsonStr: string, maxBytes: number): string {
    const truncateMarker = '... [truncated]';
    const markerBytes = Buffer.byteLength(truncateMarker, 'utf8');
    const targetBytes = maxBytes - markerBytes;

    let truncated = jsonStr;
    while (Buffer.byteLength(truncated, 'utf8') > targetBytes) {
      // 每次减少 10% 的长度
      const reduceLength = Math.max(100, Math.floor(truncated.length * 0.1));
      truncated = truncated.slice(0, -reduceLength);
    }

    return truncated + truncateMarker;
  }

  /**
   * 美化打印 JSON（用于调试）
   *
   * @param data - 要打印的数据
   * @param indent - 缩进空格数
   * @returns 格式化后的 JSON 字符串
   */
  static prettify(data: any, indent: number = 2): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    try {
      return JSON.stringify(data, null, indent);
    } catch (error) {
      console.error('[JsonUtil] Failed to prettify JSON:', error);
      return null;
    }
  }

  /**
   * 验证字符串是否为有效的 JSON
   *
   * @param str - 要验证的字符串
   * @returns 是否为有效的 JSON
   */
  static isValidJson(str: string): boolean {
    if (!str || str.trim() === '') {
      return false;
    }

    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 序列化并验证字节长度
   * 如果超过限制则抛出异常,不会静默截断
   *
   * @param data - 要序列化的数据
   * @param maxBytes - 最大字节数限制 (默认 65535 = TEXT 类型)
   * @returns 序列化后的 JSON 字符串
   * @throws Error - 当序列化失败或超过字节限制时抛出异常
   *
   * @example
   * ```typescript
   * try {
   *   const jsonStr = JsonUtil.serializeOrThrow({ large: 'data...' }, 65535);
   * } catch (error) {
   *   // 处理超长数据错误
   * }
   * ```
   */
  static serializeOrThrow(data: any, maxBytes: number = 65535): string {
    if (data === null || data === undefined) {
      return null as any;
    }

    let jsonStr: string;
    try {
      jsonStr = JSON.stringify(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`JSON 序列化失败: ${errorMessage}`);
    }

    const byteLength = Buffer.byteLength(jsonStr, 'utf8');
    if (byteLength > maxBytes) {
      throw new Error(
        `数据大小 (${byteLength} 字节) 超过数据库字段限制 (${maxBytes} 字节), 请减少数据量`,
      );
    }

    return jsonStr;
  }

  /**
   * 深度克隆对象（通过 JSON 序列化/反序列化）
   *
   * @param obj - 要克隆的对象
   * @returns 克隆后的对象
   */
  static deepClone<T>(obj: T): T | null {
    if (obj === null || obj === undefined) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error('[JsonUtil] Failed to deep clone object:', error);
      return null;
    }
  }
}
