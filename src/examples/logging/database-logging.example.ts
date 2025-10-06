import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnableDatabaseLog } from '@/common/decorators/database-log.decorator';
import { DisableDatabaseLog } from '@/common/decorators/database-log.decorator';

/**
 * 数据库日志装饰器使用示例
 *
 * 演示如何使用 @EnableDatabaseLog() 和 @DisableDatabaseLog() 控制数据库日志
 *
 * 使用场景：
 * - 生产环境全局禁用数据库日志（LOG_ENABLE_DATABASE=false）
 * - 只对关键接口使用 @EnableDatabaseLog() 启用
 * - 对高频接口使用 @DisableDatabaseLog() 排除
 */

// ========================================
// 示例 1: 关键业务接口 - 启用数据库日志
// ========================================
@ApiTags('Orders')
@Controller('examples/orders')
export class OrderLoggingExample {
  @Post()
  @ApiOperation({ summary: '创建订单（重要操作，记录到数据库）' })
  @EnableDatabaseLog() // 订单创建是关键操作，需要记录到数据库
  create(@Body() _createOrderDto: any) {
    return { message: '订单已创建，此操作已记录到数据库' };
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表（普通查询，不记录到数据库）' })
  findAll() {
    return { message: '普通查询，不记录到数据库（如果全局禁用）' };
  }
}

// ========================================
// 示例 2: 高频接口 - 禁用数据库日志
// ========================================
@ApiTags('System')
@Controller('examples/system')
@DisableDatabaseLog() // 整个 Controller 禁用数据库日志
export class SystemLoggingExample {
  @Get('health')
  @ApiOperation({ summary: '健康检查（高频调用，不记录到数据库）' })
  health() {
    return { status: 'ok', message: '健康检查不记录数据库日志' };
  }

  @Get('metrics')
  @ApiOperation({ summary: '系统指标（高频调用，不记录到数据库）' })
  metrics() {
    return { message: '监控指标不记录数据库日志' };
  }

  @Post('important-action')
  @ApiOperation({ summary: '重要操作（即使 Controller 禁用，方法级可以启用）' })
  @EnableDatabaseLog() // 方法级装饰器优先级更高
  importantAction() {
    return { message: '虽然 Controller 禁用了，但此方法仍会记录到数据库' };
  }
}

/**
 * 使用建议：
 *
 * 1. 开发环境：
 *    - 设置 LOG_ENABLE_DATABASE=true（全局启用）
 *    - 对高频接口使用 @DisableDatabaseLog() 排除
 *
 * 2. 生产环境：
 *    - 设置 LOG_ENABLE_DATABASE=false（全局禁用）
 *    - 只对关键接口使用 @EnableDatabaseLog() 启用
 *
 * 3. 应该启用的接口：
 *    - 订单、支付、退款等重要业务操作
 *    - 登录、修改密码、权限变更等安全操作
 *    - 数据删除、批量操作等高风险操作
 *
 * 4. 应该禁用的接口：
 *    - 健康检查、心跳等高频接口
 *    - 普通列表查询、详情查询
 *    - 实时统计、监控指标等接口
 */
