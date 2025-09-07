# 多阶段构建
FROM node:22-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 安装依赖（包括开发依赖，用于构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN pnpm prisma generate

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:22-alpine AS production

# 安装 pnpm
RUN npm install -g pnpm

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 生成 Prisma 客户端
RUN pnpm prisma generate

# 从构建阶段复制编译后的代码
COPY --from=base /app/dist ./dist

# 创建日志目录
RUN mkdir -p logs && chown -R nestjs:nodejs logs

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js || exit 1

# 启动应用
CMD ["node", "dist/main"]
