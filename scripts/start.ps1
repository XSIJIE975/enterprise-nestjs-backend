# ============================================================================
# 企业级 NestJS 后端系统 - Windows 项目启动脚本 (PowerShell)
# ============================================================================
# 描述: 用于开发环境的一键启动脚本，包含环境检查、依赖安装、数据库初始化等功能
# 用法: .\scripts\start.ps1
# ============================================================================

# 设置错误处理
$ErrorActionPreference = "Stop"

# ============================================================================
# 辅助函数
# ============================================================================

# 显示标题信息
function Write-Title {
    param([string]$Message)
    Write-Host ""
    Write-Host "🚀 $Message" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

# 显示成功信息
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# 显示警告信息
function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# 显示错误信息
function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# 显示信息
function Write-Info {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor White
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# ============================================================================
# 主脚本开始
# ============================================================================

Write-Title "企业级 NestJS 后端系统启动脚本"

try {
    # ========================================================================
    # 1. 检查运行环境
    # ========================================================================
    Write-Info "检查运行环境..."
    
    # 检查 Node.js 是否安装
    if (-not (Test-Command "node")) {
        Write-Error-Custom "未安装 Node.js，请先安装 Node.js 22.0.0 或更高版本"
        Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Blue
        exit 1
    }
    
    # 获取并验证 Node.js 版本
    $nodeVersion = node --version
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor White
    
    # 提取主版本号并验证（需要 Node.js 22+）
    $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajorVersion -lt 22) {
        Write-Error-Custom "Node.js 版本过低，需要 22.0.0 或更高版本，当前版本: $nodeVersion"
        exit 1
    }
    
    # 检查 pnpm 是否安装
    if (-not (Test-Command "pnpm")) {
        Write-Error-Custom "未安装 pnpm，请先安装: npm install -g pnpm"
        exit 1
    }
    
    # 获取 pnpm 版本
    $pnpmVersion = pnpm --version
    Write-Host "pnpm 版本: $pnpmVersion" -ForegroundColor White
    
    # 检查 Docker 是否安装
    if (-not (Test-Command "docker")) {
        Write-Error-Custom "未安装 Docker，请先安装 Docker Desktop"
        Write-Host "下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Blue
        exit 1
    }
    
    # 检查 Docker 是否运行
    try {
        docker ps | Out-Null
        Write-Success "Docker 环境检查通过"
    }
    catch {
        Write-Error-Custom "Docker 未运行，请启动 Docker Desktop"
        exit 1
    }
    
    # ========================================================================
    # 2. 设置环境变量
    # ========================================================================
    Write-Info "配置环境变量..."
    
    # 设置 NODE_ENV，如果未设置则默认为 development
    if (-not $env:NODE_ENV) {
        $env:NODE_ENV = "development"
    }
    Write-Host "🌍 当前环境: $env:NODE_ENV" -ForegroundColor Cyan
    
    # ========================================================================
    # 3. 检查环境配置文件
    # ========================================================================
    Write-Info "检查环境配置文件..."
    
    $envFile = ".env.$env:NODE_ENV"
    $projectRoot = Split-Path -Parent $PSScriptRoot
    $envFilePath = Join-Path $projectRoot $envFile
    $exampleEnvPath = Join-Path $projectRoot ".env.example"
    
    # 如果环境配置文件不存在，则从示例文件复制
    if (-not (Test-Path $envFilePath)) {
        Write-Warning-Custom "环境配置文件 $envFile 不存在，正在从示例文件复制..."
        if (Test-Path $exampleEnvPath) {
            Copy-Item $exampleEnvPath $envFilePath
            Write-Success "已创建 $envFile 文件"
            Write-Warning-Custom "请编辑 $envFile 文件配置相关参数后重新运行脚本"
            
            # 在 Windows 中打开文件
            if (Test-Command "code") {
                code $envFilePath
            }
            else {
                notepad $envFilePath
            }
            exit 0
        }
        else {
            Write-Error-Custom "示例环境文件 .env.example 不存在"
            exit 1
        }
    }
    else {
        Write-Success "环境配置文件已存在"
    }
    
    # ========================================================================
    # 4. 安装项目依赖
    # ========================================================================
    Write-Info "安装项目依赖..."
    
    Push-Location $projectRoot
    try {
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            throw "依赖安装失败"
        }
        Write-Success "项目依赖安装完成"
    }
    catch {
        Write-Error-Custom "依赖安装失败: $_"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 5. 生成 Prisma 客户端
    # ========================================================================
    Write-Info "生成 Prisma 客户端..."
    
    try {
        pnpm db:generate
        if ($LASTEXITCODE -ne 0) {
            throw "Prisma 客户端生成失败"
        }
        Write-Success "Prisma 客户端生成完成"
    }
    catch {
        Write-Error-Custom "Prisma 客户端生成失败: $_"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 6. 启动数据库服务
    # ========================================================================
    Write-Info "启动数据库服务（MySQL + Redis + 管理工具）..."
    
    try {
        pnpm docker:dev
        if ($LASTEXITCODE -ne 0) {
            throw "数据库服务启动失败"
        }
        Write-Success "数据库服务启动完成"
    }
    catch {
        Write-Error-Custom "数据库服务启动失败: $_"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 7. 等待数据库服务完全启动
    # ========================================================================
    Write-Info "等待数据库服务完全启动（15秒）..."
    
    # 显示进度条
    for ($i = 1; $i -le 15; $i++) {
        Write-Progress -Activity "等待数据库服务启动" -Status "已等待 $i 秒" -PercentComplete (($i / 15) * 100)
        Start-Sleep -Seconds 1
    }
    Write-Progress -Activity "等待数据库服务启动" -Completed
    Write-Success "数据库服务已就绪"
    
    # ========================================================================
    # 8. 运行数据库迁移
    # ========================================================================
    Write-Info "运行数据库迁移..."
    
    try {
        pnpm db:migrate
        if ($LASTEXITCODE -eq 0) {
            Write-Success "数据库迁移完成"
        }
        else {
            Write-Warning-Custom "数据库迁移失败，可能是首次运行或迁移已执行，继续..."
        }
    }
    catch {
        Write-Warning-Custom "数据库迁移失败: $_，继续执行..."
    }
    
    # ========================================================================
    # 9. 填充种子数据
    # ========================================================================
    Write-Info "填充种子数据..."
    
    try {
        pnpm db:seed
        if ($LASTEXITCODE -eq 0) {
            Write-Success "种子数据填充完成"
        }
        else {
            Write-Warning-Custom "种子数据填充失败，可能数据已存在，跳过..."
        }
    }
    catch {
        Write-Warning-Custom "种子数据填充失败: $_，跳过..."
    }
    
    # ========================================================================
    # 10. 启动应用服务
    # ========================================================================
    Write-Title "启动应用服务"
    
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "🎉 环境准备完成！正在启动应用..." -ForegroundColor Green
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 服务地址:" -ForegroundColor Cyan
    Write-Host "   🌐 应用服务:    http://localhost:8000" -ForegroundColor White
    Write-Host "   📚 API 文档:    http://localhost:8000/api/docs" -ForegroundColor White
    Write-Host "   🗄️  数据库管理:  http://localhost:8080" -ForegroundColor White
    Write-Host "   📊 Redis 管理:  http://localhost:8081" -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "💡 提示: 按 Ctrl+C 停止服务" -ForegroundColor Yellow
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    
    # 启动开发服务器
    pnpm start:dev
    
}
catch {
    # 捕获并显示所有未处理的错误
    Write-Error-Custom "脚本执行失败: $_"
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
finally {
    # 恢复目录位置
    Pop-Location
}
