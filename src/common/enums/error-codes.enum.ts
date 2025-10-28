// 错误码枚举定义
export enum ErrorCode {
  // ===========================================
  // S系列 - System 系统级错误 (S10000-S19999)
  // ===========================================
  SYSTEM_ERROR = 'S10000', // 系统内部错误
  SYSTEM_MAINTENANCE = 'S10001', // 系统维护中
  SYSTEM_OVERLOAD = 'S10002', // 系统过载
  SERVICE_UNAVAILABLE = 'S10003', // 服务不可用
  TIMEOUT_ERROR = 'S10004', // 超时错误

  // ===========================================
  // D系列 - Database 数据库错误 (D10000-D19999)
  // ===========================================
  DATABASE_ERROR = 'D10000', // 数据库连接错误
  DATABASE_TIMEOUT = 'D10001', // 数据库超时
  DATABASE_CONSTRAINT = 'D10002', // 数据库约束违反
  DATABASE_DUPLICATE = 'D10003', // 数据重复
  DATABASE_NOT_FOUND = 'D10004', // 数据不存在

  // ===========================================
  // A系列 - Auth 认证错误 (A10000-A19999)
  // ===========================================

  // AT子系列 - Auth Token (AT10000-AT10999)
  TOKEN_MISSING = 'AT10000', // Token缺失
  TOKEN_INVALID = 'AT10001', // Token无效
  TOKEN_EXPIRED = 'AT10002', // Token过期
  TOKEN_MALFORMED = 'AT10003', // Token格式错误
  REFRESH_TOKEN_INVALID = 'AT10004', // Refresh Token无效
  REFRESH_TOKEN_EXPIRED = 'AT10005', // Refresh Token过期

  // AU子系列 - Auth User (AU10000-AU10999)
  LOGIN_FAILED = 'AU10000', // 登录失败
  INVALID_CREDENTIALS = 'AU10001', // 凭证无效
  ACCOUNT_LOCKED = 'AU10002', // 账户被锁定
  ACCOUNT_DISABLED = 'AU10003', // 账户被禁用
  ACCOUNT_NOT_VERIFIED = 'AU10004', // 账户未验证
  LOGIN_ATTEMPTS_EXCEEDED = 'AU10005', // 登录尝试次数超限

  // AS子系列 - Auth Session (AS10000-AS10999)
  SESSION_EXPIRED = 'AS10000', // 会话过期
  SESSION_INVALID = 'AS10001', // 会话无效
  CONCURRENT_LOGIN_LIMIT = 'AS10002', // 并发登录限制
  MAX_SESSIONS_EXCEEDED = 'AS10003', // 已达到最大登录设备数
  SESSION_REVOKED = 'AS10004', // 会话已被其他设备踢出

  // ===========================================
  // P系列 - Permission 权限错误 (P10000-P19999)
  // ===========================================
  FORBIDDEN = 'P10000', // 无权限访问
  INSUFFICIENT_PERMISSIONS = 'P10001', // 权限不足
  ROLE_NOT_FOUND = 'P10002', // 角色不存在
  PERMISSION_DENIED = 'P10003', // 权限被拒绝
  RESOURCE_ACCESS_DENIED = 'P10004', // 资源访问被拒绝
  PERMISSION_NOT_FOUND = 'P10005', // 权限不存在
  PERMISSION_NAME_ALREADY_EXISTS = 'P10006', // 权限名称已存在
  PERMISSION_CODE_ALREADY_EXISTS = 'P10007', // 权限代码已存在
  PERMISSION_BATCH_DELETE_EMPTY = 'P10008', // 批量删除时没有找到可删除的权限
  ROLE_NAME_ALREADY_EXISTS = 'P10009', // 角色名称已存在
  ROLE_CODE_ALREADY_EXISTS = 'P10010', // 角色代码已存在
  ROLE_IN_USE = 'P10011', // 角色正在被使用

  // ===========================================
  // U系列 - User 用户错误 (U10000-U19999)
  // ===========================================
  USER_NOT_FOUND = 'U10000', // 用户不存在
  USER_ALREADY_EXISTS = 'U10001', // 用户已存在
  EMAIL_ALREADY_EXISTS = 'U10002', // 邮箱已存在
  USERNAME_ALREADY_EXISTS = 'U10003', // 用户名已存在
  PHONE_ALREADY_EXISTS = 'U10004', // 手机号已存在
  USER_PROFILE_INCOMPLETE = 'U10005', // 用户资料不完整

  // ===========================================
  // V系列 - Validation 参数验证错误 (V10000-V19999)
  // ===========================================

  // VP子系列 - Validation Parameter (VP10000-VP10999)
  VALIDATION_ERROR = 'VP10000', // 参数验证失败
  MISSING_PARAMETER = 'VP10001', // 缺少必需参数
  INVALID_PARAMETER = 'VP10002', // 参数格式无效
  PARAMETER_OUT_OF_RANGE = 'VP10003', // 参数超出范围

  // VF子系列 - Validation Format (VF10000-VF10999)
  INVALID_EMAIL_FORMAT = 'VF10000', // 邮箱格式无效
  INVALID_PHONE_FORMAT = 'VF10001', // 手机号格式无效
  INVALID_PASSWORD_FORMAT = 'VF10002', // 密码格式无效
  INVALID_DATE_FORMAT = 'VF10003', // 日期格式无效
  INVALID_URL_FORMAT = 'VF10004', // URL格式无效

  // ===========================================
  // R系列 - Rate Limit 限流错误 (R10000-R19999)
  // ===========================================
  RATE_LIMIT_EXCEEDED = 'R10000', // 请求频率超限
  IP_RATE_LIMIT_EXCEEDED = 'R10001', // IP请求频率超限
  USER_RATE_LIMIT_EXCEEDED = 'R10002', // 用户请求频率超限
  API_RATE_LIMIT_EXCEEDED = 'R10003', // API请求频率超限
  CONCURRENT_REQUEST_LIMIT = 'R10004', // 并发请求限制

  // ===========================================
  // B系列 - Business 业务逻辑错误 (B10000-B19999)
  // ===========================================

  // BO子系列 - Business Order (BO10000-BO10999)
  ORDER_NOT_FOUND = 'BO10000', // 订单不存在
  ORDER_STATUS_INVALID = 'BO10001', // 订单状态无效
  ORDER_CANNOT_CANCEL = 'BO10002', // 订单无法取消

  // BP子系列 - Business Payment (BP10000-BP10999)
  PAYMENT_FAILED = 'BP10000', // 支付失败
  INSUFFICIENT_BALANCE = 'BP10001', // 余额不足
  PAYMENT_METHOD_INVALID = 'BP10002', // 支付方式无效

  // ===========================================
  // E系列 - External 外部服务错误 (E10000-E19999)
  // ===========================================

  // ES子系列 - External SMS (ES10000-ES10999)
  SMS_SEND_FAILED = 'ES10000', // 短信发送失败
  SMS_RATE_LIMIT = 'ES10001', // 短信发送频率限制
  SMS_CODE_INVALID = 'ES10002', // 短信验证码无效
  SMS_CODE_EXPIRED = 'ES10003', // 短信验证码过期

  // EM子系列 - External Email (EM10000-EM10999)
  EMAIL_SEND_FAILED = 'EM10000', // 邮件发送失败
  EMAIL_TEMPLATE_NOT_FOUND = 'EM10001', // 邮件模板不存在

  // EP子系列 - External Payment (EP10000-EP10999)
  PAYMENT_GATEWAY_ERROR = 'EP10000', // 支付网关错误
  PAYMENT_GATEWAY_TIMEOUT = 'EP10001', // 支付网关超时

  // ===========================================
  // F系列 - File 文件处理错误 (F10000-F19999)
  // ===========================================
  FILE_NOT_FOUND = 'F10000', // 文件不存在
  FILE_TOO_LARGE = 'F10001', // 文件过大
  FILE_TYPE_NOT_ALLOWED = 'F10002', // 文件类型不允许
  FILE_UPLOAD_FAILED = 'F10003', // 文件上传失败
  FILE_PROCESSING_FAILED = 'F10004', // 文件处理失败

  // ===========================================
  // C系列 - Cache 缓存错误 (C10000-C19999)
  // ===========================================
  CACHE_ERROR = 'C10000', // 缓存错误
  CACHE_KEY_NOT_FOUND = 'C10001', // 缓存键不存在
  CACHE_CONNECTION_FAILED = 'C10002', // 缓存连接失败
  CACHE_TIMEOUT = 'C10003', // 缓存超时
}

// 错误码到中文消息的映射
export const ErrorMessages: Record<ErrorCode, string> = {
  // 系统错误
  [ErrorCode.SYSTEM_ERROR]: '系统内部错误',
  [ErrorCode.SYSTEM_MAINTENANCE]: '系统维护中，请稍后再试',
  [ErrorCode.SYSTEM_OVERLOAD]: '系统负载过高，请稍后再试',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ErrorCode.TIMEOUT_ERROR]: '请求超时',

  // 数据库错误
  [ErrorCode.DATABASE_ERROR]: '数据库连接错误',
  [ErrorCode.DATABASE_TIMEOUT]: '数据库操作超时',
  [ErrorCode.DATABASE_CONSTRAINT]: '数据约束违反',
  [ErrorCode.DATABASE_DUPLICATE]: '数据已存在',
  [ErrorCode.DATABASE_NOT_FOUND]: '数据不存在',

  // Token认证错误
  [ErrorCode.TOKEN_MISSING]: '缺少访问令牌',
  [ErrorCode.TOKEN_INVALID]: '访问令牌无效',
  [ErrorCode.TOKEN_EXPIRED]: '访问令牌已过期',
  [ErrorCode.TOKEN_MALFORMED]: '访问令牌格式错误',
  [ErrorCode.REFRESH_TOKEN_INVALID]: '刷新令牌无效',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: '刷新令牌已过期',

  // 用户认证错误
  [ErrorCode.LOGIN_FAILED]: '登录失败',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.ACCOUNT_LOCKED]: '账户已被锁定',
  [ErrorCode.ACCOUNT_DISABLED]: '账户已被禁用',
  [ErrorCode.ACCOUNT_NOT_VERIFIED]: '账户未验证',
  [ErrorCode.LOGIN_ATTEMPTS_EXCEEDED]: '登录尝试次数过多，请稍后再试',

  // 会话错误
  [ErrorCode.SESSION_EXPIRED]: '会话已过期，请重新登录',
  [ErrorCode.SESSION_INVALID]: '会话无效',
  [ErrorCode.CONCURRENT_LOGIN_LIMIT]: '超出并发登录限制',
  [ErrorCode.MAX_SESSIONS_EXCEEDED]:
    '登录设备已达上限，已为您注销最早登录的设备',
  [ErrorCode.SESSION_REVOKED]: '您的账号在其他设备登录，当前会话已失效',

  // 权限错误
  [ErrorCode.FORBIDDEN]: '无权限访问该资源',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
  [ErrorCode.ROLE_NOT_FOUND]: '角色不存在',
  [ErrorCode.PERMISSION_DENIED]: '权限被拒绝',
  [ErrorCode.RESOURCE_ACCESS_DENIED]: '资源访问被拒绝',
  [ErrorCode.PERMISSION_NOT_FOUND]: '权限不存在',
  [ErrorCode.PERMISSION_NAME_ALREADY_EXISTS]: '权限名称已被使用',
  [ErrorCode.PERMISSION_CODE_ALREADY_EXISTS]: '权限代码已被使用',
  [ErrorCode.PERMISSION_BATCH_DELETE_EMPTY]: '没有找到可删除的权限',
  [ErrorCode.ROLE_NAME_ALREADY_EXISTS]: '角色名称已被使用',
  [ErrorCode.ROLE_CODE_ALREADY_EXISTS]: '角色代码已被使用',
  [ErrorCode.ROLE_IN_USE]: '角色正在被用户使用，无法删除',

  // 用户错误
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: '邮箱地址已被使用',
  [ErrorCode.USERNAME_ALREADY_EXISTS]: '用户名已被使用',
  [ErrorCode.PHONE_ALREADY_EXISTS]: '手机号已被使用',
  [ErrorCode.USER_PROFILE_INCOMPLETE]: '用户资料不完整',

  // 参数验证错误
  [ErrorCode.VALIDATION_ERROR]: '参数验证失败',
  [ErrorCode.MISSING_PARAMETER]: '缺少必需参数',
  [ErrorCode.INVALID_PARAMETER]: '参数格式无效',
  [ErrorCode.PARAMETER_OUT_OF_RANGE]: '参数超出允许范围',

  // 格式验证错误
  [ErrorCode.INVALID_EMAIL_FORMAT]: '邮箱格式无效',
  [ErrorCode.INVALID_PHONE_FORMAT]: '手机号格式无效',
  [ErrorCode.INVALID_PASSWORD_FORMAT]: '密码格式无效',
  [ErrorCode.INVALID_DATE_FORMAT]: '日期格式无效',
  [ErrorCode.INVALID_URL_FORMAT]: 'URL格式无效',

  // 限流错误
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率过高，请稍后再试',
  [ErrorCode.IP_RATE_LIMIT_EXCEEDED]: 'IP请求频率超限',
  [ErrorCode.USER_RATE_LIMIT_EXCEEDED]: '用户请求频率超限',
  [ErrorCode.API_RATE_LIMIT_EXCEEDED]: 'API请求频率超限',
  [ErrorCode.CONCURRENT_REQUEST_LIMIT]: '并发请求数量超限',

  // 业务逻辑错误
  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_STATUS_INVALID]: '订单状态无效',
  [ErrorCode.ORDER_CANNOT_CANCEL]: '订单无法取消',
  [ErrorCode.PAYMENT_FAILED]: '支付失败',
  [ErrorCode.INSUFFICIENT_BALANCE]: '余额不足',
  [ErrorCode.PAYMENT_METHOD_INVALID]: '支付方式无效',

  // 外部服务错误
  [ErrorCode.SMS_SEND_FAILED]: '短信发送失败',
  [ErrorCode.SMS_RATE_LIMIT]: '短信发送频率超限',
  [ErrorCode.SMS_CODE_INVALID]: '短信验证码无效',
  [ErrorCode.SMS_CODE_EXPIRED]: '短信验证码已过期',
  [ErrorCode.EMAIL_SEND_FAILED]: '邮件发送失败',
  [ErrorCode.EMAIL_TEMPLATE_NOT_FOUND]: '邮件模板不存在',
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: '支付网关错误',
  [ErrorCode.PAYMENT_GATEWAY_TIMEOUT]: '支付网关超时',

  // 文件错误
  [ErrorCode.FILE_NOT_FOUND]: '文件不存在',
  [ErrorCode.FILE_TOO_LARGE]: '文件大小超出限制',
  [ErrorCode.FILE_TYPE_NOT_ALLOWED]: '文件类型不允许',
  [ErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
  [ErrorCode.FILE_PROCESSING_FAILED]: '文件处理失败',

  // 缓存错误
  [ErrorCode.CACHE_ERROR]: '缓存服务错误',
  [ErrorCode.CACHE_KEY_NOT_FOUND]: '缓存数据不存在',
  [ErrorCode.CACHE_CONNECTION_FAILED]: '缓存服务连接失败',
  [ErrorCode.CACHE_TIMEOUT]: '缓存操作超时',
};
