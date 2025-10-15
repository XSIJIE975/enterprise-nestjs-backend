import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../../shared/database/database.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LoggerModule } from '../../shared/logger/logger.module';

/**
 * 认证模块
 * 提供用户认证、授权、Token 管理等功能
 */
@Module({
  imports: [
    // Passport 认证模块
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    // JWT 模块配置（Access Token）
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.accessTokenSecret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTokenExpiresIn', '15m'),
          issuer: configService.get('jwt.issuer', 'enterprise-nestjs-backend'),
          audience: configService.get(
            'jwt.audience',
            'enterprise-nestjs-backend',
          ),
        },
      }),
    }),

    // 用户模块
    forwardRef(() => UsersModule),

    // 数据库模块
    DatabaseModule,

    // 缓存模块
    CacheModule,

    // 日志模块
    LoggerModule,
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy, LocalStrategy],

  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
