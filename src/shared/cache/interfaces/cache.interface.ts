/**
 * 缓存服务接口
 * 定义统一的缓存操作规范
 */
export interface ICacheService {
  /**
   * 获取缓存值
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  set(key: string, value: any, ttl?: number): Promise<'OK' | null>;

  /**
   * 删除缓存键
   */
  del(key: string): Promise<number>;

  /**
   * 批量删除缓存键（支持模式匹配）
   * @param pattern 键模式，如 'user:*'
   */
  delPattern(pattern: string): Promise<number>;

  /**
   * 检查键是否存在
   */
  exists(key: string): Promise<number>;

  /**
   * 获取键的剩余过期时间
   */
  ttl(key: string): Promise<number>;

  /**
   * 清空所有缓存
   */
  flush(): Promise<'OK'>;

  /**
   * 批量获取
   */
  mget(keys: string[]): Promise<(string | null)[]>;

  /**
   * 批量设置
   */
  mset(keyValuePairs: Record<string, any>): Promise<'OK'>;

  /**
   * 自增
   */
  incr(key: string): Promise<number>;

  /**
   * 自减
   */
  decr(key: string): Promise<number>;

  /**
   * 设置过期时间
   */
  expire(key: string, seconds: number): Promise<number>;

  /**
   * 获取或设置缓存（缓存未命中时调用 factory）
   */
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;

  /**
   * 生成缓存键
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string;

  /**
   * 添加元素到集合
   */
  sadd(key: string, ...members: string[]): Promise<number>;

  /**
   * 获取集合所有成员
   */
  smembers(key: string): Promise<string[]>;

  /**
   * 从集合中移除元素
   */
  srem(key: string, ...members: string[]): Promise<number>;

  /**
   * 检查缓存服务是否可用
   */
  isAvailable(): boolean;

  /**
   * 获取缓存类型
   */
  getType(): 'redis' | 'memory';
}
