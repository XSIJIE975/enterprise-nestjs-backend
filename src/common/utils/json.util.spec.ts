import { JsonUtil } from './json.util';

describe('JsonUtil - JSON 序列化工具类', () => {
  describe('serialize - 序列化 JSON 数据', () => {
    it('应该成功序列化对象', () => {
      const data = { name: 'John', age: 30, city: 'Beijing' };
      const result = JsonUtil.serialize(data);

      expect(result).toBe('{"name":"John","age":30,"city":"Beijing"}');
    });

    it('应该成功序列化数组', () => {
      const data = [1, 2, 3, 4, 5];
      const result = JsonUtil.serialize(data);

      expect(result).toBe('[1,2,3,4,5]');
    });

    it('应该处理 null 值', () => {
      const result = JsonUtil.serialize(null);
      expect(result).toBeNull();
    });

    it('应该处理 undefined 值', () => {
      const result = JsonUtil.serialize(undefined);
      expect(result).toBeNull();
    });

    it('应该序列化嵌套对象', () => {
      const data = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', lang: 'zh-CN' },
      };
      const result = JsonUtil.serialize(data);

      expect(result).toContain('"user"');
      expect(result).toContain('"settings"');
      expect(JsonUtil.deserialize(result)).toEqual(data);
    });

    it('应该截断过长的 JSON 字符串', () => {
      const largeData = { data: 'x'.repeat(70000) };
      const result = JsonUtil.serialize(largeData, 1000);

      expect(result).toContain('... [truncated]');
      expect(Buffer.byteLength(result!, 'utf8')).toBeLessThanOrEqual(1000);
    });

    it('应该处理特殊字符', () => {
      const data = {
        text: '包含中文和特殊字符 @#$%',
        emoji: '😀🎉',
        quote: 'He said "Hello"',
      };
      const result = JsonUtil.serialize(data);

      expect(result).toBeTruthy();
      expect(JsonUtil.deserialize(result!)).toEqual(data);
    });
  });

  describe('deserialize - 反序列化 JSON 字符串', () => {
    it('应该成功反序列化有效的 JSON 字符串', () => {
      const jsonStr = '{"name":"John","age":30}';
      const result = JsonUtil.deserialize(jsonStr);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('应该处理空字符串', () => {
      const result = JsonUtil.deserialize('');
      expect(result).toBeNull();
    });

    it('应该处理 null 值', () => {
      const result = JsonUtil.deserialize(null);
      expect(result).toBeNull();
    });

    it('应该处理 undefined 值', () => {
      const result = JsonUtil.deserialize(undefined);
      expect(result).toBeNull();
    });

    it('应该处理无效的 JSON 字符串', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = JsonUtil.deserialize('{invalid json}');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该反序列化数组', () => {
      const jsonStr = '[1,2,3,4,5]';
      const result = JsonUtil.deserialize(jsonStr);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('应该处理空格', () => {
      const jsonStr = '  {"name":"John"}  ';
      const result = JsonUtil.deserialize(jsonStr);

      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('serializeFields - 批量序列化字段', () => {
    it('应该序列化指定的字段', () => {
      const obj = {
        params: { page: 1, limit: 10 },
        body: { name: 'John' },
        other: 'value',
      };

      const result = JsonUtil.serializeFields(obj, ['params', 'body']);

      expect(result.params).toBe('{"page":1,"limit":10}');
      expect(result.body).toBe('{"name":"John"}');
      expect(result.other).toBe('value');
    });

    it('应该跳过 null 字段', () => {
      const obj = {
        params: null,
        body: { name: 'John' },
        other: 'value',
      };

      const result = JsonUtil.serializeFields(obj, ['params', 'body']);

      expect(result.params).toBeNull();
      expect(result.body).toBe('{"name":"John"}');
    });

    it('应该不修改原对象', () => {
      const obj = {
        params: { page: 1 },
        body: { name: 'John' },
      };

      const result = JsonUtil.serializeFields(obj, ['params']);

      expect(obj.params).toEqual({ page: 1 }); // 原对象未改变
      expect(result.params).toBe('{"page":1}'); // 新对象已序列化
    });
  });

  describe('deserializeFields - 批量反序列化字段', () => {
    it('应该反序列化指定的字段', () => {
      const obj = {
        params: '{"page":1,"limit":10}',
        body: '{"name":"John"}',
        other: 'value',
      };

      const result = JsonUtil.deserializeFields(obj, ['params', 'body']);

      expect(result.params).toEqual({ page: 1, limit: 10 });
      expect(result.body).toEqual({ name: 'John' });
      expect(result.other).toBe('value');
    });

    it('应该跳过非字符串字段', () => {
      const obj = {
        params: '{"page":1}',
        body: null,
        other: 123,
      };

      const result = JsonUtil.deserializeFields(obj, [
        'params',
        'body',
        'other',
      ]);

      expect(result.params).toEqual({ page: 1 });
      expect(result.body).toBeNull();
      expect(result.other).toBe(123);
    });
  });

  describe('serializeSafe - 安全序列化（处理循环引用）', () => {
    it('应该处理循环引用', () => {
      const obj: any = { name: 'John' };
      obj.self = obj; // 创建循环引用

      const result = JsonUtil.serializeSafe(obj);

      expect(result).toContain('[Circular]');
      expect(result).toContain('"name":"John"');
    });

    it('应该处理正常对象', () => {
      const obj = { name: 'John', age: 30 };
      const result = JsonUtil.serializeSafe(obj);

      expect(result).toBe('{"name":"John","age":30}');
    });

    it('应该截断过长的数据', () => {
      const largeData = { data: 'x'.repeat(70000) };
      const result = JsonUtil.serializeSafe(largeData, 1000);

      expect(result).toContain('... [truncated]');
      expect(Buffer.byteLength(result!, 'utf8')).toBeLessThanOrEqual(1000);
    });
  });

  describe('prettify - 美化打印 JSON', () => {
    it('应该格式化 JSON 输出', () => {
      const data = { name: 'John', age: 30 };
      const result = JsonUtil.prettify(data);

      expect(result).toContain('\n');
      expect(result).toContain('  "name"');
      expect(result).toContain('  "age"');
    });

    it('应该支持自定义缩进', () => {
      const data = { name: 'John' };
      const result = JsonUtil.prettify(data, 4);

      expect(result).toContain('    "name"');
    });

    it('应该处理 null 值', () => {
      const result = JsonUtil.prettify(null);
      expect(result).toBeNull();
    });
  });

  describe('isValidJson - 验证 JSON 字符串', () => {
    it('应该识别有效的 JSON', () => {
      expect(JsonUtil.isValidJson('{"name":"John"}')).toBe(true);
      expect(JsonUtil.isValidJson('[1,2,3]')).toBe(true);
      expect(JsonUtil.isValidJson('"string"')).toBe(true);
      expect(JsonUtil.isValidJson('123')).toBe(true);
      expect(JsonUtil.isValidJson('true')).toBe(true);
    });

    it('应该识别无效的 JSON', () => {
      expect(JsonUtil.isValidJson('{invalid}')).toBe(false);
      expect(JsonUtil.isValidJson('undefined')).toBe(false);
      expect(JsonUtil.isValidJson('')).toBe(false);
      expect(JsonUtil.isValidJson('  ')).toBe(false);
    });
  });

  describe('deepClone - 深度克隆对象', () => {
    it('应该深度克隆对象', () => {
      const original = {
        name: 'John',
        address: {
          city: 'Beijing',
          country: 'China',
        },
        hobbies: ['reading', 'coding'],
      };

      const cloned = JsonUtil.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned?.address).not.toBe(original.address);
      expect(cloned?.hobbies).not.toBe(original.hobbies);
    });

    it('应该处理 null 值', () => {
      const result = JsonUtil.deepClone(null);
      expect(result).toBeNull();
    });

    it('应该处理基本类型', () => {
      expect(JsonUtil.deepClone('string')).toBe('string');
      expect(JsonUtil.deepClone(123)).toBe(123);
      expect(JsonUtil.deepClone(true)).toBe(true);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空对象', () => {
      const result = JsonUtil.serialize({});
      expect(result).toBe('{}');
    });

    it('应该处理空数组', () => {
      const result = JsonUtil.serialize([]);
      expect(result).toBe('[]');
    });

    it('应该处理包含 null 的对象', () => {
      const data = { name: 'John', age: null, city: undefined };
      const result = JsonUtil.serialize(data);
      const deserialized = JsonUtil.deserialize(result!);

      expect(deserialized).toEqual({ name: 'John', age: null });
    });

    it('应该处理数字 0', () => {
      const data = { count: 0, active: false };
      const result = JsonUtil.serialize(data);

      expect(result).toBe('{"count":0,"active":false}');
      expect(JsonUtil.deserialize(result!)).toEqual(data);
    });

    it('应该处理 Date 对象', () => {
      const data = { createdAt: new Date('2025-10-23') };
      const result = JsonUtil.serialize(data);

      expect(result).toContain('2025-10-23');
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大型对象', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));

      const result = JsonUtil.serialize(largeArray);
      expect(result).toBeTruthy();

      const deserialized = JsonUtil.deserialize(result!);
      expect(deserialized).toHaveLength(1000);
    });
  });
});
