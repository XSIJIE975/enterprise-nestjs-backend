/**
 * 时区转换工具的单元测试
 * 测试本地时区日期范围到 UTC 的转换，以及 UTC 时间到本地时区的响应格式化
 */

import { convertLocalDateRangeToUTC, convertToTimezone } from './timezone.util';

describe('convertLocalDateRangeToUTC', () => {
  describe('北京时间 (Asia/Shanghai)', () => {
    const SHANGHAI = 'Asia/Shanghai';

    test('应正确转换单个日期范围 - YYYY-MM-DD 格式', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        SHANGHAI,
      );

      expect(result).not.toBeNull();
      expect(result?.startUtc.toISOString()).toBe('2025-10-31T16:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T15:59:59.999Z');
    });

    test('应正确转换日期范围 - 多天', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-02',
        SHANGHAI,
      );

      expect(result).not.toBeNull();
      expect(result?.startUtc.toISOString()).toBe('2025-10-31T16:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-02T15:59:59.999Z');
    });

    test('应正确转换 ISO8601 时间格式', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01T08:30:00',
        '2025-11-01T17:30:00',
        SHANGHAI,
      );

      expect(result).not.toBeNull();
      // 北京时间 08:30 = UTC 00:30
      // 北京时间 17:30 = UTC 09:30
      expect(result?.startUtc.toISOString()).toBe('2025-11-01T00:30:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T09:30:00.000Z');
    });

    test('只指定开始日期时，应推断结束日期', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        undefined,
        SHANGHAI,
      );

      expect(result).not.toBeNull();
      expect(result?.startUtc.toISOString()).toBe('2025-10-31T16:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T15:59:59.999Z');
    });

    test('只指定结束日期时，应推断开始日期', () => {
      const result = convertLocalDateRangeToUTC(
        undefined,
        '2025-11-01',
        SHANGHAI,
      );

      expect(result).not.toBeNull();
      expect(result?.startUtc.toISOString()).toBe('2025-10-31T16:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T15:59:59.999Z');
    });

    test('两个都不指定时应返回 null', () => {
      const result = convertLocalDateRangeToUTC(undefined, undefined, SHANGHAI);
      expect(result).toBeNull();
    });
  });

  describe('纽约时间 (America/New_York)', () => {
    const NEW_YORK = 'America/New_York';

    test('应正确转换 - 需考虑 EDT 偏移 (UTC-4)', () => {
      // 2025-11-01 在纽约实际上是 EDT（美国夏令时），UTC-4
      // 注意：美国夏令时在 2025-11-02 02:00 才结束，所以 11-01 还是 EDT
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        NEW_YORK,
      );

      expect(result).not.toBeNull();
      // 纽约时间 2025-11-01T00:00:00 = UTC 2025-11-01T04:00:00
      // 纽约时间 2025-11-01T23:59:59 = UTC 2025-11-02T03:59:59
      expect(result?.startUtc.toISOString()).toBe('2025-11-01T04:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-02T03:59:59.999Z');
    });

    test('应正确转换 - 考虑夏令时 (EDT: UTC-4)', () => {
      // 2025-06-01 在纽约是 EDT（夏令时），UTC-4
      const result = convertLocalDateRangeToUTC(
        '2025-06-01',
        '2025-06-01',
        NEW_YORK,
      );

      expect(result).not.toBeNull();
      // 纽约时间 2025-06-01T00:00:00 = UTC 2025-06-01T04:00:00
      expect(result?.startUtc.toISOString()).toBe('2025-06-01T04:00:00.000Z');
    });
  });

  describe('伦敦时间 (Europe/London)', () => {
    const LONDON = 'Europe/London';

    test('应正确转换 - GMT 时间 (UTC+0)', () => {
      // 2025-11-01 在伦敦是 GMT，UTC+0
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        LONDON,
      );

      expect(result).not.toBeNull();
      expect(result?.startUtc.toISOString()).toBe('2025-11-01T00:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T23:59:59.999Z');
    });
  });

  describe('边界情况', () => {
    test('应处理无效日期格式', () => {
      const result = convertLocalDateRangeToUTC(
        '2025/11/01', // 错误格式
        '2025-11-01',
        'Asia/Shanghai',
      );

      // 应该返回 null 或进行降级处理
      expect(result).toBeNull();
    });

    test('应处理无效时区', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        'Invalid/Timezone',
      );

      // 无效时区应该返回 null
      expect(result).toBeNull();
    });

    test('应处理跨年查询', () => {
      const result = convertLocalDateRangeToUTC(
        '2024-12-31',
        '2025-01-01',
        'Asia/Shanghai',
      );

      expect(result).not.toBeNull();
      expect(result?.startUtc).toBeTruthy();
      expect(result?.endUtc).toBeTruthy();
    });

    test('应处理同一天但不同时刻的查询', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01T10:00:00',
        '2025-11-01T20:00:00',
        'Asia/Shanghai',
      );

      expect(result).not.toBeNull();
      // 北京时间 10:00 = UTC 02:00
      // 北京时间 20:00 = UTC 12:00
      expect(result?.startUtc.toISOString()).toBe('2025-11-01T02:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T12:00:00.000Z');
    });
  });

  describe('实际应用场景', () => {
    test('场景 1：员工在北京 09:00-18:00 查询当天日志', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01T09:00:00',
        '2025-11-01T18:00:00',
        'Asia/Shanghai',
      );

      expect(result).not.toBeNull();
      // 北京时间 09:00 = UTC 01:00
      // 北京时间 18:00 = UTC 10:00
      expect(result?.startUtc.toISOString()).toBe('2025-11-01T01:00:00.000Z');
      expect(result?.endUtc.toISOString()).toBe('2025-11-01T10:00:00.000Z');
    });

    test('场景 2：国际支持团队在纽约查询全球日志', () => {
      const result = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        'America/New_York',
      );

      expect(result).not.toBeNull();
      // 这个 UTC 范围包含了很多其他地区同一天的数据
      const durationHours =
        (result!.endUtc.getTime() - result!.startUtc.getTime()) /
        (1000 * 60 * 60);
      // 由于 endOf('day') 的毫秒精度，允许浮点误差，使用接近值
      expect(durationHours).toBeCloseTo(24, 1);
    });

    test('场景 3：跨越 UTC+8 到 UTC-5 的数据查询', () => {
      // 北京时间的今天 = UTC 的什么时间？
      const shanghai = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        'Asia/Shanghai',
      );
      // 纽约时间的同一天 = UTC 的什么时间？
      const newYork = convertLocalDateRangeToUTC(
        '2025-11-01',
        '2025-11-01',
        'America/New_York',
      );

      expect(shanghai).not.toBeNull();
      expect(newYork).not.toBeNull();

      // 两个时区的相同日期在 UTC 上的范围完全不同
      expect(shanghai?.startUtc.getTime()).not.toBe(
        newYork?.startUtc.getTime(),
      );
    });
  });
});

describe('convertToTimezone', () => {
  describe('UTC 到本地时区转换（响应格式化）', () => {
    test('应正确将 UTC Date 转换为北京时间 ISO 字符串', () => {
      const utcDate = new Date('2025-10-06T08:44:25.558Z');
      const result = convertToTimezone(utcDate, 'Asia/Shanghai');

      expect(result).not.toBeNull();
      // UTC 2025-10-06T08:44:25.558Z = 北京时间 2025-10-06T16:44:25.558+08:00
      expect(result).toBe('2025-10-06T16:44:25.558+08:00');
    });

    test('应正确将 ISO 字符串格式的 UTC 时间转换', () => {
      const result = convertToTimezone(
        '2025-10-06T08:44:25.558Z',
        'Asia/Shanghai',
      );

      expect(result).not.toBeNull();
      expect(result).toBe('2025-10-06T16:44:25.558+08:00');
    });

    test('应正确转换到纽约时区', () => {
      const utcDate = new Date('2025-11-01T10:00:00.000Z');
      const result = convertToTimezone(utcDate, 'America/New_York');

      expect(result).not.toBeNull();
      // UTC 2025-11-01T10:00:00Z = 纽约时间 2025-11-01T06:00:00-04:00 (EDT)
      // 注意：2025-11-01 还在夏令时，不是冬令时
      expect(result).toBe('2025-11-01T06:00:00.000-04:00');
    });

    test('应正确转换到伦敦时区', () => {
      const utcDate = new Date('2025-11-01T10:00:00.000Z');
      const result = convertToTimezone(utcDate, 'Europe/London');

      expect(result).not.toBeNull();
      // UTC 2025-11-01T10:00:00Z = 伦敦时间 2025-11-01T10:00:00+00:00 (GMT)
      expect(result).toBe('2025-11-01T10:00:00.000+00:00');
    });

    test('应考虑夏令时转换（EDT）', () => {
      const utcDate = new Date('2025-06-01T10:00:00.000Z');
      const result = convertToTimezone(utcDate, 'America/New_York');

      expect(result).not.toBeNull();
      // UTC 2025-06-01T10:00:00Z = 纽约时间 2025-06-01T06:00:00-04:00 (EDT)
      expect(result).toBe('2025-06-01T06:00:00.000-04:00');
    });

    test('应处理 null 或 undefined 输入', () => {
      expect(convertToTimezone(null, 'Asia/Shanghai')).toBeNull();
      expect(convertToTimezone(undefined, 'Asia/Shanghai')).toBeNull();
    });

    test('应处理无效日期字符串', () => {
      const result = convertToTimezone('invalid-date', 'Asia/Shanghai');
      expect(result).toBeNull();
    });

    test('应处理无效时区', () => {
      const utcDate = new Date('2025-10-06T08:44:25.558Z');
      // 使用无效时区，Luxon 的 setZone() 会返回无效的 DateTime
      // 然后 toISO() 会返回 null
      const result = convertToTimezone(utcDate, 'Invalid/Timezone');
      // 无效时区应该返回 null
      expect(result).toBeNull();
    });

    test('应在跨越夏令时边界时正确处理', () => {
      // 2025-03-09 是美国夏令时开始日期（EST → EDT）
      const beforeDST = convertToTimezone(
        '2025-03-09T06:00:00.000Z',
        'America/New_York',
      );
      const afterDST = convertToTimezone(
        '2025-03-09T08:00:00.000Z',
        'America/New_York',
      );

      expect(beforeDST).not.toBeNull();
      expect(afterDST).not.toBeNull();
      // 转换前后偏移量应该不同
      expect(beforeDST).toContain('-05:00'); // EST
      expect(afterDST).toContain('-04:00'); // EDT
    });
  });

  describe('convertToTimezone 实际应用', () => {
    test('应能用于响应数据中的日期格式化', () => {
      // 模拟从数据库返回的 UTC 时间
      const dbData = {
        id: 1,
        createdAt: new Date('2025-11-01T02:30:00.000Z'),
        updatedAt: new Date('2025-11-01T08:00:00.000Z'),
      };

      const shanghaiTime = convertToTimezone(dbData.createdAt, 'Asia/Shanghai');
      expect(shanghaiTime).toBe('2025-11-01T10:30:00.000+08:00');
    });

    test('应能处理多个时区的同一时刻转换', () => {
      const utcTime = '2025-11-01T12:00:00.000Z';

      const shanghai = convertToTimezone(utcTime, 'Asia/Shanghai');
      const london = convertToTimezone(utcTime, 'Europe/London');
      const newYork = convertToTimezone(utcTime, 'America/New_York');

      expect(shanghai).toBe('2025-11-01T20:00:00.000+08:00');
      expect(london).toBe('2025-11-01T12:00:00.000+00:00');
      // 2025-11-01 在纽约还是 EDT (UTC-4)
      expect(newYork).toBe('2025-11-01T08:00:00.000-04:00');
    });
  });
});
