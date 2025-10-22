#!/usr/bin/env tsx

/**
 * 计算 Prisma 迁移文件的 checksum
 * 用于手动设置 baseline 时填充 _prisma_migrations 表
 *
 * 使用方法:
 *   pnpm tsx scripts/tools/calculate-migration-checksum.ts <migration_folder_name>
 *   或
 *   tsx scripts/tools/calculate-migration-checksum.ts <migration_folder_name>
 *
 * 示例:
 *   pnpm tsx scripts/tools/calculate-migration-checksum.ts 20251018030905_init_databases
 *   pnpm tsx scripts/tools/calculate-migration-checksum.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/** 迁移结果信息 */
interface MigrationResult {
  /** 迁移名称（文件夹名） */
  migrationName: string;
  /** SHA256 checksum */
  checksum: string;
  /** 迁移文件完整路径 */
  filePath: string;
  /** 文件大小（字节） */
  fileSize: number;
}

/** 颜色输出工具类 */
class ColorLogger {
  private static readonly colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
  };

  static error(message: string): void {
    console.error(`${this.colors.red}❌ ${message}${this.colors.reset}`);
  }

  static success(message: string): void {
    console.log(`${this.colors.green}✅ ${message}${this.colors.reset}`);
  }

  static info(message: string): void {
    console.log(`${this.colors.blue}ℹ️  ${message}${this.colors.reset}`);
  }

  static warning(message: string): void {
    console.log(`${this.colors.yellow}⚠️  ${message}${this.colors.reset}`);
  }

  static title(message: string): void {
    console.log(`${this.colors.cyan}🔍 ${message}${this.colors.reset}\n`);
  }

  static note(message: string): void {
    console.log(`${this.colors.magenta}📝 ${message}${this.colors.reset}`);
  }
}

/** Prisma 迁移 Checksum 计算器 */
class MigrationChecksumCalculator {
  private readonly migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(
      __dirname,
      '..',
      '..',
      'prisma',
      'migrations',
    );
  }

  /**
   * 计算文件的 SHA256 checksum
   * Prisma 使用 SHA256 算法计算迁移文件内容的哈希值
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * 处理单个迁移文件
   */
  private processMigration(migrationName: string): MigrationResult | null {
    const migrationPath = path.join(
      this.migrationsDir,
      migrationName,
      'migration.sql',
    );

    // 检查迁移文件是否存在
    if (!fs.existsSync(migrationPath)) {
      ColorLogger.error(`找不到迁移文件: ${migrationPath}`);
      return null;
    }

    // 读取迁移文件内容
    const content = fs.readFileSync(migrationPath, 'utf8');

    // 计算 checksum
    const checksum = this.calculateChecksum(content);

    return {
      migrationName,
      checksum,
      filePath: migrationPath,
      fileSize: content.length,
    };
  }

  /**
   * 获取所有迁移文件夹
   */
  private getAllMigrations(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      ColorLogger.error(`迁移文件夹不存在: ${this.migrationsDir}`);
      return [];
    }

    return fs
      .readdirSync(this.migrationsDir)
      .filter(item => {
        const itemPath = path.join(this.migrationsDir, item);
        return (
          fs.statSync(itemPath).isDirectory() && item !== 'migration_lock.toml'
        );
      })
      .sort(); // 按时间戳排序
  }

  /**
   * 生成 SQL 插入语句
   */
  private generateInsertSQL(result: MigrationResult): string {
    return `INSERT INTO \`_prisma_migrations\` 
  (\`id\`, \`checksum\`, \`finished_at\`, \`migration_name\`, \`logs\`, \`started_at\`, \`applied_steps_count\`)
VALUES
  (UUID(), '${result.checksum}', NOW(3), '${result.migrationName}', NULL, NOW(3), 1);`;
  }

  /**
   * 显示使用帮助
   */
  private showUsage(): void {
    console.log('\n使用方法:');
    console.log(
      '  pnpm tsx scripts/tools/calculate-migration-checksum.ts <migration_folder_name>',
    );
    console.log('  或');
    console.log(
      '  tsx scripts/tools/calculate-migration-checksum.ts <migration_folder_name>',
    );
    console.log('\n示例:');
    console.log(
      '  pnpm tsx scripts/tools/calculate-migration-checksum.ts 20251018030905_init_databases',
    );
    console.log('\n或者计算所有迁移:');
    console.log(
      '  pnpm tsx scripts/tools/calculate-migration-checksum.ts --all',
    );
  }

  /**
   * 计算并显示所有迁移的 checksum
   */
  private processAllMigrations(): void {
    const migrations = this.getAllMigrations();

    if (migrations.length === 0) {
      ColorLogger.error('没有找到迁移文件');
      process.exit(1);
    }

    console.log(`找到 ${migrations.length} 个迁移文件:\n`);

    const results: MigrationResult[] = [];

    migrations.forEach((name, index) => {
      const result = this.processMigration(name);

      if (result) {
        results.push(result);
        console.log(`${index + 1}. ${result.migrationName}`);
        console.log(`   Checksum: ${result.checksum}`);
        console.log(`   文件大小: ${result.fileSize} 字节\n`);
      }
    });

    ColorLogger.note('批量插入 SQL 语句:\n');
    console.log('-- 设置 Baseline: 标记所有迁移为已应用');
    console.log('-- 执行前请确保这些迁移已经在数据库中应用\n');

    results.forEach(result => {
      console.log(this.generateInsertSQL(result));
    });
  }

  /**
   * 计算并显示单个迁移的 checksum
   */
  private processSingleMigration(migrationName: string): void {
    const result = this.processMigration(migrationName);

    if (!result) {
      process.exit(1);
    }

    ColorLogger.success('计算完成!\n');
    console.log('迁移信息:');
    console.log(`  名称: ${result.migrationName}`);
    console.log(`  Checksum: ${result.checksum}`);
    console.log(`  文件路径: ${result.filePath}`);
    console.log(`  文件大小: ${result.fileSize} 字节`);
    console.log('\n📝 SQL 插入语句:\n');
    console.log(this.generateInsertSQL(result));
  }

  /**
   * 显示提示信息
   */
  private showTips(): void {
    console.log('\n💡 提示:');
    console.log('  1. 在执行 INSERT 前,请确保该迁移已经在数据库中应用');
    console.log('  2. Checksum 用于验证迁移文件的完整性,不能随意修改');
    console.log('  3. 如果迁移文件内容改变,checksum 也会改变');
    console.log('  4. 生产环境请谨慎操作,建议先在测试环境验证');
  }

  /**
   * 主入口函数
   */
  public run(args: string[]): void {
    ColorLogger.title('Prisma 迁移 Checksum 计算工具');

    const migrationName = args[0];

    if (!migrationName) {
      ColorLogger.error('请提供迁移文件夹名称');
      this.showUsage();
      process.exit(1);
    }

    if (migrationName === '--all') {
      this.processAllMigrations();
    } else {
      this.processSingleMigration(migrationName);
    }

    this.showTips();
  }
}

// 主程序入口
if (require.main === module) {
  const calculator = new MigrationChecksumCalculator();
  const args = process.argv.slice(2);
  calculator.run(args);
}

export default MigrationChecksumCalculator;
