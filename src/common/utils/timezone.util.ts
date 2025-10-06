/**
 * 时区转换工具类
 * 用于将 UTC 时间转换为指定时区的本地时间
 */

/**
 * 将 UTC Date 对象转换为指定时区的 ISO 8601 字符串
 * @param date UTC Date 对象
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
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // 检查是否是有效的日期
    if (isNaN(dateObj.getTime())) {
      return null;
    }

    // 获取指定时区的本地时间字符串
    const localString = dateObj.toLocaleString('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });

    // 获取时区偏移量
    const offset = getTimezoneOffset(dateObj, timezone);

    // 格式化为 ISO 8601 格式: 2025-10-06T16:44:25.558+08:00
    return `${localString.replace(' ', 'T')}${offset}`;
  } catch (error) {
    console.error('Time zone conversion error:', error);
    return date instanceof Date ? date.toISOString() : date.toString();
  }
}

/**
 * 获取指定时区相对于 UTC 的偏移量字符串
 * @param date Date 对象
 * @param timezone IANA 时区标识符
 * @returns 时区偏移量字符串，如 '+08:00', '-05:00'
 */
function getTimezoneOffset(date: Date, timezone: string): string {
  // 获取 UTC 时间戳
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  // 获取目标时区时间戳
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

  // 计算偏移量（分钟）
  const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;

  // 格式化为 +HH:MM 或 -HH:MM
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;

  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 递归转换对象中的所有 Date 字段到指定时区
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
