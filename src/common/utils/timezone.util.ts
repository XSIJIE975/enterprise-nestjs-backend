/**
 * 时区转换工具类
 *
 * 功能包括：
 * 1. 将 UTC 时间转换为指定时区的本地时间（用于响应输出）
 * 2. 将本地时区的日期范围转换为 UTC 时间范围（用于数据库查询）
 * 3. 验证时区的有效性
 */

import { DateTime } from 'luxon';

export interface DateRangeUTC {
  startUtc: Date;
  endUtc: Date;
}

/**
 * 将 UTC Date 对象转换为指定时区的 ISO 8601 字符串
 * 用于响应输出，将存储的 UTC 时间转换为用户时区的显示格式
 *
 * @param date UTC Date 对象或 ISO 字符串
 * @param timezone IANA 时区标识符，如 'Asia/Shanghai', 'America/New_York'
 * @returns ISO 8601 格式的时间字符串，包含时区偏移量
 *
 * @example
 * // 输入: new Date('2025-10-06T08:44:25.558Z'), 'Asia/Shanghai'
 * // 输出: '2025-10-06T16:44:25.558+08:00'
 */
export function convertToTimezone(
  date: Date | string | null | undefined,
  timezone: string,
): string | null {
  if (!date) {
    return null;
  }

  try {
    // 使用 Luxon 直接进行时区转换和格式化
    // DateTime.fromISO() 可以接受 ISO 字符串，也可以用 fromJSDate() 处理 Date 对象
    let dt: DateTime;

    if (typeof date === 'string') {
      dt = DateTime.fromISO(date, { zone: 'UTC' });
    } else {
      dt = DateTime.fromJSDate(date, { zone: 'UTC' });
    }

    // 检查是否是有效的日期时间
    if (!dt.isValid) {
      return null;
    }

    // 转换到目标时区，toISO() 直接返回 ISO 8601 格式（包含时区偏移量）
    // 例如: '2025-10-06T16:44:25.558+08:00'
    return dt.setZone(timezone).toISO();
  } catch (error) {
    console.error('Time zone conversion error:', error);
    return date instanceof Date ? date.toISOString() : date.toString();
  }
}

/**
 * 将本地时区的日期范围转换为 UTC 时间范围
 * 用于数据库查询，将用户输入的本地时区日期转换为 UTC 进行精确查询
 *
 * @param startDate - 开始日期 (YYYY-MM-DD 或 ISO8601 字符串)，以指定时区的本地时间理解
 * @param endDate - 结束日期 (YYYY-MM-DD 或 ISO8601 字符串)，以指定时区的本地时间理解
 * @param timezone - IANA 时区标识符 (如 'Asia/Shanghai')
 * @returns 转换后的 UTC 时间范围对象 { startUtc, endUtc }
 *
 * @example
 * // 北京时间 2025-11-01 整天的 UTC 时间范围
 * const range = convertLocalDateRangeToUTC('2025-11-01', '2025-11-01', 'Asia/Shanghai');
 * // 返回: {
 * //   startUtc: 2025-10-31T16:00:00.000Z,
 * //   endUtc: 2025-11-01T15:59:59.999Z
 * // }
 */
export function convertLocalDateRangeToUTC(
  startDate: string | undefined,
  endDate: string | undefined,
  timezone: string,
): DateRangeUTC | null {
  if (!startDate && !endDate) {
    return null;
  }

  try {
    // 判断是否为仅日期格式 (YYYY-MM-DD)
    const isDateOnly = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

    // 使用 Luxon 进行日期解析和转换
    let startUtc: Date | null = null;
    let endUtc: Date | null = null;

    if (startDate) {
      const dt = isDateOnly(startDate)
        ? DateTime.fromISO(startDate, { zone: timezone })
        : DateTime.fromISO(startDate, { zone: timezone });

      if (!dt.isValid) {
        throw new Error(`Invalid start date: ${startDate}`);
      }

      startUtc = dt.toUTC().toJSDate();
    }

    if (endDate) {
      const dt = isDateOnly(endDate)
        ? DateTime.fromISO(endDate, { zone: timezone }).endOf('day')
        : DateTime.fromISO(endDate, { zone: timezone });

      if (!dt.isValid) {
        throw new Error(`Invalid end date: ${endDate}`);
      }

      endUtc = dt.toUTC().toJSDate();
    }

    // 如果只提供了开始日期，结束日期默认为开始日期的结束时刻
    if (startUtc && !endUtc) {
      const dt = DateTime.fromISO(startDate!, { zone: timezone }).endOf('day');
      endUtc = dt.toUTC().toJSDate();
    }

    // 如果只提供了结束日期，开始日期默认为结束日期的开始时刻
    if (!startUtc && endUtc) {
      const dt = DateTime.fromISO(endDate!, { zone: timezone }).startOf('day');
      startUtc = dt.toUTC().toJSDate();
    }

    return {
      startUtc: startUtc!,
      endUtc: endUtc!,
    };
  } catch (error) {
    console.error('Failed to convert date range to UTC:', error);
    return null;
  }
}

/**
 * 递归转换对象中的所有 Date 字段到指定时区
 * 用于响应输出，将查询结果中的所有日期转换为指定时区的格式
 *
 * @param obj 要转换的对象
 * @param timezone 目标时区
 * @returns 转换后的对象
 */
export function convertDatesInObject<T>(obj: T, timezone: string): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 如果是 Date 对象，直接转换
  if (obj instanceof Date) {
    return convertToTimezone(obj, timezone) as any;
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesInObject(item, timezone)) as any;
  }

  // 如果是普通对象，递归处理每个属性
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertDatesInObject(obj[key], timezone);
      }
    }
    return result;
  }

  // 其他类型直接返回
  return obj;
}

/**
 * 验证时区是否有效
 * @param timezone IANA 时区标识符
 * @returns 是否为有效时区
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * 常用时区列表
 */
export const COMMON_TIMEZONES = {
  // 亚洲
  SHANGHAI: 'Asia/Shanghai', // 中国标准时间 (CST/UTC+8)
  HONG_KONG: 'Asia/Hong_Kong', // 香港时间 (HKT/UTC+8)
  TOKYO: 'Asia/Tokyo', // 日本标准时间 (JST/UTC+9)
  SINGAPORE: 'Asia/Singapore', // 新加坡时间 (SGT/UTC+8)
  SEOUL: 'Asia/Seoul', // 韩国标准时间 (KST/UTC+9)
  DUBAI: 'Asia/Dubai', // 阿联酋时间 (GST/UTC+4)

  // 欧洲
  LONDON: 'Europe/London', // 格林威治标准时间 (GMT/UTC+0)
  PARIS: 'Europe/Paris', // 中欧时间 (CET/UTC+1)
  BERLIN: 'Europe/Berlin', // 中欧时间 (CET/UTC+1)
  MOSCOW: 'Europe/Moscow', // 莫斯科时间 (MSK/UTC+3)

  // 美洲
  NEW_YORK: 'America/New_York', // 美国东部时间 (EST/UTC-5)
  CHICAGO: 'America/Chicago', // 美国中部时间 (CST/UTC-6)
  DENVER: 'America/Denver', // 美国山地时间 (MST/UTC-7)
  LOS_ANGELES: 'America/Los_Angeles', // 美国太平洋时间 (PST/UTC-8)
  SAO_PAULO: 'America/Sao_Paulo', // 巴西时间 (BRT/UTC-3)

  // 大洋洲
  SYDNEY: 'Australia/Sydney', // 澳大利亚东部时间 (AEDT/UTC+11)
  AUCKLAND: 'Pacific/Auckland', // 新西兰时间 (NZDT/UTC+13)

  // UTC
  UTC: 'UTC', // 协调世界时 (UTC+0)
} as const;
