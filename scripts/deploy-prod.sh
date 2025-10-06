#!/bin/bash

# ============================================================================
# 企业级 NestJS 后端系统 - 生产环境全量部署脚本 (Bash)
# ============================================================================
# 描述: 用于生产环境的自动化部署脚本，包含镜像构建、服务启动、数据库迁移等功能
# 用法: ./scripts/deploy-prod.sh
# 警告: 此脚本将部署到生产环境，请谨慎使用！
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

# 执行命令并检查结果
execute_command() {
    local cmd="$1"
    local error_msg="$2"
    
    if ! eval "$cmd"; then
        print_error "$error_msg"
        exit 1
    fi
}

# ============================================================================
# 主脚本开始
# ============================================================================

print_title "企业级 NestJS 后端系统 - 生产环境全量部署"

# ============================================================================
# 1. 部署确认
# ============================================================================
echo ""
echo "⚠️  警告: 此操作将部署到生产环境！"
echo ""
read -p "请输入 'YES' 确认继续部署: " confirmation

if [ "$confirmation" != "YES" ]; then
    print_info "部署已取消"
    exit 0
fi

echo ""

# ============================================================================
# 2. 检查 Docker 环境
# ============================================================================
print_info "检查 Docker 环境..."

# 检查 Docker 是否安装
if ! command_exists docker; then
    print_error "未安装 Docker，请先安装 Docker"
    echo "下载地址: https://www.docker.com/get-started"
    exit 1
fi

# 检查 Docker Compose 是否可用
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

# 检查 Docker 是否运行
if ! docker ps &> /dev/null; then
    print_error "Docker 未运行，请启动 Docker 服务"
    exit 1
fi

print_success "Docker 环境检查通过"

# 设置 Docker Compose 配置文件
COMPOSE_FILE="docker-compose.prod.yml"

# ============================================================================
# 3. 切换到项目根目录
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 检查 docker-compose.prod.yml 是否存在
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "生产环境配置文件 $COMPOSE_FILE 不存在"
    exit 1
fi

# ============================================================================
# 4. 检查生产环境配置文件
# ============================================================================
print_info "检查生产环境配置文件..."

PROD_ENV_FILE=".env.production"
if [ ! -f "$PROD_ENV_FILE" ]; then
    print_warning "生产环境配置文件 $PROD_ENV_FILE 不存在"
    print_info "正在创建生产环境配置文件..."
    
    if [ -f ".env.example" ]; then
        cp ".env.example" "$PROD_ENV_FILE"
        print_success "已创建 $PROD_ENV_FILE 文件"
        print_warning "请先配置 $PROD_ENV_FILE 文件后再重新运行部署脚本"
        
        # 尝试打开编辑器
        if command_exists code; then
            code "$PROD_ENV_FILE"
        elif command_exists vim; then
            vim "$PROD_ENV_FILE"
        elif command_exists nano; then
            nano "$PROD_ENV_FILE"
        else
            echo "请手动编辑文件: $PROD_ENV_FILE"
        fi
        
        exit 0
    else
        print_error "示例配置文件 .env.example 不存在"
        exit 1
    fi
else
    print_success "生产环境配置文件已存在"
fi

# ============================================================================
# 5. 构建生产镜像
# ============================================================================
print_info "构建生产环境 Docker 镜像..."
echo "这可能需要几分钟时间，请耐心等待..."

if ! $COMPOSE_CMD -f "$COMPOSE_FILE" build app; then
    print_error "应用镜像构建失败"
    exit 1
fi

print_success "应用镜像构建完成"

# ============================================================================
# 6. 启动所有生产服务
# ============================================================================
print_info "启动所有生产环境服务（应用、数据库、Redis 等）..."

if ! $COMPOSE_CMD -f "$COMPOSE_FILE" up -d; then
    print_error "服务启动失败"
    print_info "正在回滚服务..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    exit 1
fi

print_success "所有服务启动完成"

# ============================================================================
# 7. 等待服务完全启动
# ============================================================================
print_info "等待服务完全启动（30秒）..."

# 显示进度
for i in {1..30}; do
    printf "\r⏳ 已等待 %d 秒..." "$i"
    sleep 1
done
echo ""

print_success "服务已就绪"

# ============================================================================
# 8. 检查服务状态
# ============================================================================
print_info "检查服务运行状态..."

if $COMPOSE_CMD -f "$COMPOSE_FILE" ps; then
    print_success "服务状态正常"
else
    print_warning "无法获取服务状态"
fi

# ============================================================================
# 9. 运行数据库迁移
# ============================================================================
print_info "运行生产环境数据库迁移..."
print_warning "数据库迁移将直接操作生产数据库，请确保已备份数据"

if $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T app pnpm db:migrate:deploy; then
    print_success "数据库迁移完成"
else
    print_warning "数据库迁移失败，请检查日志"
fi

# ============================================================================
# 10. 填充生产种子数据（可选）
# ============================================================================
print_info "填充生产环境种子数据..."
print_warning "通常生产环境不需要种子数据，如果数据已存在将跳过"

if $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T app pnpm db:seed; then
    print_success "种子数据填充完成"
else
    print_warning "种子数据填充失败，可能数据已存在"
fi

# ============================================================================
# 11. 显示部署完成信息
# ============================================================================
echo ""
echo "======================================================================"
echo "🎉 生产环境部署完成！"
echo "======================================================================"
echo ""
echo "📍 服务信息:"
echo "   🌐 应用地址:    http://localhost"
echo "   📚 API 文档:    http://localhost/api/docs"
echo "   🗄️  数据库端口:  localhost:3306"
echo "   📊 Redis 端口:  localhost:6379"
echo ""
echo "======================================================================"
echo ""
echo "💡 常用管理命令:"
echo "   查看服务状态:  $COMPOSE_CMD -f $COMPOSE_FILE ps"
echo "   查看实时日志:  $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "   查看应用日志:  $COMPOSE_CMD -f $COMPOSE_FILE logs -f app"
echo "   重启所有服务:  $COMPOSE_CMD -f $COMPOSE_FILE restart"
echo "   重启应用服务:  $COMPOSE_CMD -f $COMPOSE_FILE restart app"
echo "   停止所有服务:  $COMPOSE_CMD -f $COMPOSE_FILE stop"
echo "   停止并删除:    $COMPOSE_CMD -f $COMPOSE_FILE down"
echo "   进入应用容器:  $COMPOSE_CMD -f $COMPOSE_FILE exec app sh"
echo ""
echo "======================================================================"
echo ""
echo "📝 重要提示:"
echo "   1. 定期备份数据库数据"
echo "   2. 监控服务运行状态和日志"
echo "   3. 及时更新系统安全补丁"
echo "   4. 使用防火墙限制端口访问"
echo ""
echo "======================================================================"
echo ""

# 询问是否查看日志
read -p "是否查看服务日志？(y/N): " view_logs
if [ "$view_logs" = "y" ] || [ "$view_logs" = "Y" ]; then
    print_info "显示服务日志（按 Ctrl+C 退出）..."
    sleep 2
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f
fi
