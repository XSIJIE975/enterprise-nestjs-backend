#!/bin/bash

# ============================================================================
# 企业级 NestJS 后端系统 - 测试环境部署脚本 (Bash)
# ============================================================================
# 描述: 用于测试环境的自动化部署脚本
# 用法: ./scripts/deploy-test.sh
# 支持: Linux / macOS
# ============================================================================

set -e

# ============================================================================
# 辅助函数
# ============================================================================

print_title() {
    echo ""
    echo "🧪 $1"
    echo "======================================================================"
}

print_success() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
}

print_error() {
    echo "❌ $1"
}

print_info() {
    echo "📋 $1"
}

command_exists() {
    command -v "$1" &> /dev/null
}

# ============================================================================
# 主脚本开始
# ============================================================================

print_title "企业级 NestJS 后端系统 - 测试环境部署"

# ============================================================================
# 1. 检查 Docker 环境
# ============================================================================
print_info "检查 Docker 环境..."

if ! command_exists docker; then
    print_error "未安装 Docker，请先安装 Docker"
    exit 1
fi

USE_DOCKER_COMPOSE=false
if docker compose version &> /dev/null; then
    USE_DOCKER_COMPOSE=true
    COMPOSE_CMD="docker compose"
    print_success "检测到 Docker Compose (V2)"
elif command_exists docker-compose; then
    USE_DOCKER_COMPOSE=false
    COMPOSE_CMD="docker-compose"
    print_success "检测到 Docker Compose (V1)"
else
    print_error "未安装 Docker Compose"
    exit 1
fi

if ! docker ps &> /dev/null; then
    print_error "Docker 未运行，请启动 Docker 服务"
    exit 1
fi

print_success "Docker 环境检查通过"

COMPOSE_FILE="docker-compose.test.yml"

# ============================================================================
# 2. 切换到项目根目录
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "测试环境配置文件 $COMPOSE_FILE 不存在"
    exit 1
fi

# ============================================================================
# 3. 检查测试环境配置文件
# ============================================================================
print_info "检查测试环境配置文件..."

TEST_ENV_FILE=".env.test"
if [ ! -f "$TEST_ENV_FILE" ]; then
    print_warning "测试环境配置文件 $TEST_ENV_FILE 不存在"
    print_info "正在创建测试环境配置文件..."
    
    if [ -f ".env.example" ]; then
        cp ".env.example" "$TEST_ENV_FILE"
        print_success "已创建 $TEST_ENV_FILE 文件"
        print_info "请先配置 $TEST_ENV_FILE 文件后再重新运行部署脚本"
        exit 0
    else
        print_error "示例配置文件 .env.example 不存在"
        exit 1
    fi
else
    print_success "测试环境配置文件已存在"
fi

# ============================================================================
# 4. 构建测试镜像
# ============================================================================
print_info "构建测试环境 Docker 镜像..."

if ! $COMPOSE_CMD -f "$COMPOSE_FILE" build app; then
    print_error "应用镜像构建失败"
    exit 1
fi

print_success "应用镜像构建完成"

# ============================================================================
# 5. 启动所有测试服务
# ============================================================================
print_info "启动所有测试环境服务..."

if ! $COMPOSE_CMD -f "$COMPOSE_FILE" up -d; then
    print_error "服务启动失败"
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    exit 1
fi

print_success "所有服务启动完成"

# ============================================================================
# 6. 等待服务完全启动
# ============================================================================
print_info "等待服务完全启动（30秒）..."

for i in {1..30}; do
    printf "\r⏳ 已等待 %d 秒..." "$i"
    sleep 1
done
echo ""

print_success "服务已就绪"

# ============================================================================
# 7. 检查服务状态
# ============================================================================
print_info "检查服务运行状态..."

if $COMPOSE_CMD -f "$COMPOSE_FILE" ps; then
    print_success "服务状态正常"
else
    print_warning "无法获取服务状态"
fi

# ============================================================================
# 8. 运行数据库迁移
# ============================================================================
print_info "运行测试环境数据库迁移..."

if $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T app pnpm prisma migrate deploy; then
    print_success "数据库迁移完成"
else
    print_warning "数据库迁移失败，请检查日志"
fi

# ============================================================================
# 9. 填充测试种子数据
# ============================================================================
print_info "填充测试环境种子数据..."

if $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T app pnpm db:seed:test; then
    print_success "种子数据填充完成"
else
    print_warning "种子数据填充失败"
fi

# ============================================================================
# 10. 显示部署完成信息
# ============================================================================
echo ""
echo "======================================================================"
echo "🎉 测试环境部署完成！"
echo "======================================================================"
echo ""
echo "📍 服务信息:"
echo "   🌐 应用地址:    http://localhost:8001"
echo "   📚 API 文档:    http://localhost:8001/api/docs"
echo "   🗄️  数据库端口:  localhost:3307"
echo "   📊 Redis 端口:  localhost:6380"
echo ""
echo "======================================================================"
echo ""
echo "💡 常用管理命令:"
echo "   查看服务状态:  $COMPOSE_CMD -f $COMPOSE_FILE ps"
echo "   查看实时日志:  $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "   重启所有服务:  $COMPOSE_CMD -f $COMPOSE_FILE restart"
echo "   停止所有服务:  $COMPOSE_CMD -f $COMPOSE_FILE stop"
echo "   停止并删除:    $COMPOSE_CMD -f $COMPOSE_FILE down"
echo ""
echo "======================================================================"
echo ""

read -p "是否查看服务日志？(y/N): " view_logs
if [ "$view_logs" = "y" ] || [ "$view_logs" = "Y" ]; then
    print_info "显示服务日志（按 Ctrl+C 退出）..."
    sleep 2
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f
fi
