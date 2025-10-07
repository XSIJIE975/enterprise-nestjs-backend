# ===========================
# 第一阶段：依赖安装
# ===========================
FROM node:22-alpine AS dependencies

# 安装 pnpm
RUN npm install -g pnpm@9.12.3

WORKDIR /app

# 只复制依赖清单文件
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# ===========================
# 第二阶段：构建应用
# ===========================
FROM node:22-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm@9.12.3

WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=dependencies /app/node_modules ./node_modules

# 复制源代码和配置文件
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma/
COPY src ./src

# 生成 Prisma 客户端（包含 Alpine Linux 目标）
RUN pnpm prisma generate

# 构建应用
RUN pnpm build

# ===========================
# 第三阶段：生产镜像
# ===========================
FROM node:22-alpine AS production

# 安装 pnpm
RUN npm install -g pnpm@9.12.3

# 设置时区为上海（如需其他时区可修改）
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

# 创建非 root 用户和组
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 复制 Prisma schema（生产环境可能需要执行迁移）
COPY prisma ./prisma/

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# 生成 Prisma 客户端（生产环境）
RUN pnpm prisma generate

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 创建日志目录并设置权限
RUN mkdir -p logs && \
    chown -R nestjs:nodejs logs && \
    chown -R nestjs:nodejs /app

# 切换到非 root 用户
USER nestjs

# 设置生产环境变量
ENV NODE_ENV=production \
    TZ=Asia/Shanghai

# 暴露端口
EXPOSE 8000

# 健康检查（通过 HTTP 请求检查 /health 端点）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/src/main"]
