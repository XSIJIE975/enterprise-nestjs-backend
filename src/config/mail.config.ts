import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Mail 配置环境变量 Schema
 */
export const mailEnvSchema = z.object({
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_SECURE: z.string().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM_NAME: z.string().optional(),
  MAIL_FROM: z.string().email().optional().or(z.literal('')),
  MAIL_PREVIEW: z.string().optional(),
});

export type MailEnvConfig = z.infer<typeof mailEnvSchema>;

/**
 * 邮件配置
 * 用于发送系统邮件（注册验证、密码重置等）
 */
export const mailConfig = registerAs('mail', () => ({
  // SMTP 服务器配置
  host: process.env.MAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: process.env.MAIL_SECURE === 'true', // 是否使用 SSL

  // 认证信息
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
  },

  // 发件人信息
  from: {
    name: process.env.MAIL_FROM_NAME || 'Enterprise NestJS',
    address: process.env.MAIL_FROM || 'noreply@enterprise.local',
  },

  // 邮件发送配置
  defaults: {
    from: process.env.MAIL_FROM || 'noreply@enterprise.local',
  },

  // 预览模式（开发环境）
  preview: process.env.MAIL_PREVIEW === 'true',
}));
