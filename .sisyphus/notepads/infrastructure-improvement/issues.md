# 已知问题和陷阱

## 配置验证

### Issue-001: 循环依赖风险

**问题**: 配置验证不能使用 LoggerService，因为 LoggerModule 依赖 ConfigModule

**解决**: 验证失败时使用 `console.error()` 直接输出，不依赖 LoggerService

---

## 账户锁定

### Issue-002: 竞态条件

**问题**: 多个并发请求同时验证密码→同时失败→锁定计数不准确

**解决**: 使用 Redis INCR + EXPIRE 原子操作（不要 GET→SET）

---
