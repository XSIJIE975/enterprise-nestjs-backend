/**
 * ============================================================================
 * PM2 进程管理配置文件
 * ============================================================================
 * 企业级 NestJS 后端系统 - 多环境 PM2 部署配置
 *
 * 支持环境：
 * - development: 开发环境（单实例 fork 模式）
 * - test: 测试环境（2实例 cluster 模式）
 * - production: 生产环境（CPU核心数 cluster 模式）
 *
 * 使用方法：
 * 1. 生产环境启动：pm2 start ecosystem.config.js --env production --only nest-api-prod
 * 2. 测试环境启动：pm2 start ecosystem.config.js --env test --only nest-api-test
 * 3. 开发环境启动：pm2 start ecosystem.config.js --env development --only nest-api-dev
 * 4. 零停机重载：pm2 reload nest-api-prod
 * 5. 查看状态：pm2 status
 * 6. 查看日志：pm2 logs nest-api-prod
 *
 * 官方文档：https://pm2.keymetrics.io/docs/usage/application-declaration/
 * ============================================================================
 */

module.exports = {
  apps: [
    // ========================================================================
    // 开发环境配置
    // ========================================================================
    {
      // 应用名称
      name: 'nest-api-dev',

      // 启动脚本路径
      script: './dist/src/main.js',

      // 实例数量（开发环境使用单实例）
      instances: 1,

      // 执行模式：fork（单进程）或 cluster（多进程负载均衡）
      exec_mode: 'fork',

      // 是否监听文件变化自动重启（生产环境务必设为 false）
      watch: false,

      // 内存超过限制自动重启
      max_memory_restart: '500M',

      // 环境变量
      env: {
        NODE_ENV: 'development',
      },

      // 环境变量文件（PM2 会自动加载）
      env_file: '.env.development',

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2/dev-error.log',
      out_file: './logs/pm2/dev-out.log',
      merge_logs: true,

      // 自动重启配置
      autorestart: true,
      max_restarts: 10, // 10次重启失败后停止
      min_uptime: '10s', // 运行至少10秒才算成功启动

      // 优雅关闭
      kill_timeout: 3000, // 3秒超时强制kill
      listen_timeout: 3000, // 3秒等待应用监听端口
      shutdown_with_message: false,
    },

    // ========================================================================
    // 测试环境配置
    // ========================================================================
    {
      name: 'nest-api-test',
      script: './dist/src/main.js',

      // 测试环境使用2个实例
      instances: 2,
      exec_mode: 'cluster',

      watch: false,
      max_memory_restart: '800M',

      env: {
        NODE_ENV: 'test',
      },
      env_file: '.env.test',

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2/test-error.log',
      out_file: './logs/pm2/test-out.log',
      merge_logs: true,

      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      kill_timeout: 5000,
      listen_timeout: 5000,
      shutdown_with_message: false,
    },

    // ========================================================================
    // 生产环境配置
    // ========================================================================
    {
      name: 'nest-api-prod',
      script: './dist/src/main.js',

      // 'max' 表示根据 CPU 核心数自动设置实例数
      // 也可以指定数字，例如：instances: 4
      instances: 'max',
      exec_mode: 'cluster',

      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2/prod-error.log',
      out_file: './logs/pm2/prod-out.log',
      merge_logs: true,

      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s', // 生产环境要求至少运行30秒才算成功

      // 优雅关闭配置
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: false,

      // 定时重启（可选）- 每天凌晨4点重启，释放内存
      cron_restart: '0 4 * * *',

      // 实例变量（用于区分不同实例的日志等）
      instance_var: 'INSTANCE_ID',

      // 错误重启间隔
      restart_delay: 4000,

      // 指数退避重启延迟（可选）
      exp_backoff_restart_delay: 100,

      // 强制颜色输出
      force: true,

      // 时间戳
      time: true,
    },
  ],

  // ==========================================================================
  // PM2 Deploy 配置（可选 - 用于远程部署）
  // ==========================================================================
  // deploy: {
  //   production: {
  //     user: 'deploy',
  //     host: 'your-server.com',
  //     ref: 'origin/main',
  //     repo: 'git@github.com:yourname/enterprise-nestjs-backend.git',
  //     path: '/var/www/production',
  //     'pre-deploy-local': '',
  //     'post-deploy':
  //       'pnpm install && pnpm build && pnpm db:migrate:deploy && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': '',
  //   },
  // },
};
