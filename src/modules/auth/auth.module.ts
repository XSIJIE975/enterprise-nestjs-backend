import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { RepositoriesModule } from '@/shared/repositories/repositories.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { AccountLockoutService } from './services/account-lockout.service';

/**
 * 认证模块
 * 提供用户认证、授权、Token 管理等功能
 */
@Module({
  imports: [
    RepositoriesModule,
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
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy, LocalStrategy, AccountLockoutService],

  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
