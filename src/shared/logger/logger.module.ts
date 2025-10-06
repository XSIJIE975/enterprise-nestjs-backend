import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    // 使用异步初始化，以便注入 ConfigService
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 从环境变量读取配置
        const logLevel = configService.get<string>('LOG_LEVEL', 'info');
        const logDir = configService.get<string>('LOG_DIR', 'logs');
        const maxSize = configService.get<string>('LOG_MAX_SIZE', '20m');
        const maxFiles = configService.get<string>('LOG_MAX_FILES', '14d');
        const datePattern = configService.get<string>(
          'LOG_DATE_PATTERN',
          'YYYY-MM-DD',
        );
        const zippedArchive =
          configService.get<string>('LOG_ZIPPED_ARCHIVE', 'true') === 'true';

        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
          ),
          transports: [
            // 控制台输出
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              ),
            }),
            // 错误日志文件
            new DailyRotateFile({
              dirname: logDir,
              filename: 'error-%DATE%.log',
              datePattern: datePattern,
              level: 'error',
              maxSize: maxSize,
              maxFiles: maxFiles,
              zippedArchive: zippedArchive,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
            // 所有日志文件
            new DailyRotateFile({
              dirname: logDir,
              filename: 'application-%DATE%.log',
              datePattern: datePattern,
              maxSize: maxSize,
              maxFiles: maxFiles,
              zippedArchive: zippedArchive,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          ],
        };
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
