#!/bin/bash

# ============================================================================
# 企业级 NestJS 后端系统 - 项目启动脚本 (Bash)
# ============================================================================
# 描述: 用于开发环境的一键启动脚本，包含环境检查、依赖安装、数据库初始化等功能
# 用法: ./scripts/start.sh
# 支持: Linux / macOS
# ============================================================================

# 设置错误处理：遇到错误立即退出
set -e

# ============================================================================
# 辅助函数
# ============================================================================

# 显示标题信息
print_title() {
    echo ""
    echo "🚀 $1"
    echo "======================================================================"
}

# 显示成功信息
print_success() {
    echo "✅ $1"
}

# 显示警告信息
print_warning() {
    echo "⚠️  $1"
}

# 显示错误信息
print_error() {
    echo "❌ $1"
}

# 显示信息
print_info() {
    echo "📋 $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# ============================================================================
# 主脚本开始
# ============================================================================

print_title "企业级 NestJS 后端系统启动脚本"

# ============================================================================
# 1. 检查运行环境
# ============================================================================
print_info "检查运行环境..."

# 检查 Node.js 是否安装
if ! command_exists node; then
    print_error "未安装 Node.js，请先安装 Node.js 22.0.0 或更高版本"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 获取并验证 Node.js 版本
NODE_VERSION=$(node --version)
echo "Node.js 版本: $NODE_VERSION"

# 提取主版本号并验证（需要 Node.js 22+）
NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\)\..*/\1/')
if [ "$NODE_MAJOR_VERSION" -lt 22 ]; then
    print_error "Node.js 版本过低，需要 22.0.0 或更高版本，当前版本: $NODE_VERSION"
    exit 1
fi

# 检查 pnpm 是否安装
if ! command_exists pnpm; then
    print_error "未安装 pnpm，请先安装: npm install -g pnpm"
    exit 1
fi

# 获取 pnpm 版本
PNPM_VERSION=$(pnpm --version)
echo "pnpm 版本: $PNPM_VERSION"

# 检查 Docker 是否安装
if ! command_exists docker; then
    print_error "未安装 Docker，请先安装 Docker"
    echo "下载地址: https://www.docker.com/get-started"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker ps &> /dev/null; then
    print_error "Docker 未运行，请启动 Docker 服务"
    exit 1
fi

print_success "Docker 环境检查通过"

# ============================================================================
# 2. 设置环境变量
# ============================================================================
print_info "配置环境变量..."

# 设置 NODE_ENV，如果未设置则默认为 development
export NODE_ENV=${NODE_ENV:-development}
echo "🌍 当前环境: $NODE_ENV"

# ============================================================================
# 3. 检查环境配置文件
# ============================================================================
print_info "检查环境配置文件..."

ENV_FILE=".env.$NODE_ENV"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE_PATH="$PROJECT_ROOT/$ENV_FILE"
EXAMPLE_ENV_PATH="$PROJECT_ROOT/.env.example"

# 如果环境配置文件不存在，则从示例文件复制
if [ ! -f "$ENV_FILE_PATH" ]; then
    print_warning "环境配置文件 $ENV_FILE 不存在，正在从示例文件复制..."
    if [ -f "$EXAMPLE_ENV_PATH" ]; then
        cp "$EXAMPLE_ENV_PATH" "$ENV_FILE_PATH"
        print_success "已创建 $ENV_FILE 文件"
        print_warning "请编辑 $ENV_FILE 文件配置相关参数后重新运行脚本"
        
        # 尝试打开编辑器
        if command_exists code; then
            code "$ENV_FILE_PATH"
        elif command_exists vim; then
            vim "$ENV_FILE_PATH"
        elif command_exists nano; then
            nano "$ENV_FILE_PATH"
        else
            echo "请手动编辑文件: $ENV_FILE_PATH"
        fi
        exit 0
    else
        print_error "示例环境文件 .env.example 不存在"
        exit 1
    fi
else
    print_success "环境配置文件已存在"
fi

# ============================================================================
# 4. 安装项目依赖
# ============================================================================
print_info "安装项目依赖..."

cd "$PROJECT_ROOT"

if ! pnpm install; then
    print_error "依赖安装失败"
    exit 1
fi

print_success "项目依赖安装完成"

# ============================================================================
# 5. 生成 Prisma 客户端
# ============================================================================
print_info "生成 Prisma 客户端..."

if ! pnpm db:generate; then
    print_error "Prisma 客户端生成失败"
    exit 1
fi

print_success "Prisma 客户端生成完成"

# ============================================================================
# 6. 启动数据库服务
# ============================================================================
print_info "启动数据库服务（MySQL + Redis + 管理工具）..."

if ! pnpm docker:dev; then
    print_error "数据库服务启动失败"
    exit 1
fi

print_success "数据库服务启动完成"

# ============================================================================
# 7. 等待数据库服务完全启动
# ============================================================================
print_info "等待数据库服务完全启动（15秒）..."

# 显示进度（Bash 版本的进度提示）
for i in {1..15}; do
    printf "\r⏳ 已等待 %d 秒..." "$i"
    sleep 1
done
echo ""

print_success "数据库服务已就绪"

# ============================================================================
# 8. 运行数据库迁移
# ============================================================================
print_info "运行数据库迁移..."

if pnpm db:migrate; then
    print_success "数据库迁移完成"
else
    print_warning "数据库迁移失败，可能是首次运行或迁移已执行，继续..."
fi

# ============================================================================
# 9. 填充种子数据
# ============================================================================
print_info "填充种子数据..."

if pnpm db:seed; then
    print_success "种子数据填充完成"
else
    print_warning "种子数据填充失败，可能数据已存在，跳过..."
fi

# ============================================================================
# 10. 启动应用服务
# ============================================================================
print_title "启动应用服务"

echo ""
echo "======================================================================"
echo "� 环境准备完成！正在启动应用..."
echo "======================================================================"
echo ""
echo "📍 服务地址:"
echo "   🌐 应用服务:    http://localhost:3000"
echo "   📚 API 文档:    http://localhost:3000/api/docs"
echo "   🗄️  数据库管理:  http://localhost:8080"
echo "   📊 Redis 管理:  http://localhost:8081"
echo ""
echo "======================================================================"
echo "💡 提示: 按 Ctrl+C 停止服务"
echo "======================================================================"
echo ""

# 启动开发服务器
pnpm start:dev