# ============================================================================
# 企业级 NestJS 后端系统 - 测试环境部署脚本 (PowerShell)
# ============================================================================
# 描述: 用于测试环境的自动化部署脚本
# 用法: .\scripts\deploy-test.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

# ============================================================================
# 辅助函数
# ============================================================================

function Write-Title {
    param([string]$Message)
    Write-Host ""
    Write-Host "🧪 $Message" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor White
}

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

Write-Title "企业级 NestJS 后端系统 - 测试环境部署"

try {
    # ========================================================================
    # 1. 检查 Docker 环境
    # ========================================================================
    Write-Info "检查 Docker 环境..."
    
    if (-not (Test-Command "docker")) {
        Write-Error-Custom "未安装 Docker，请先安装 Docker Desktop"
        exit 1
    }
    
    try {
        docker compose version | Out-Null
        $useDockerCompose = $true
        Write-Success "检测到 Docker Compose (V2)"
    }
    catch {
        if (Test-Command "docker-compose") {
            $useDockerCompose = $false
            Write-Success "检测到 Docker Compose (V1)"
        }
        else {
            Write-Error-Custom "未安装 Docker Compose"
            exit 1
        }
    }
    
    try {
        docker ps | Out-Null
        Write-Success "Docker 环境检查通过"
    }
    catch {
        Write-Error-Custom "Docker 未运行，请启动 Docker Desktop"
        exit 1
    }
    
    $composeCmd = if ($useDockerCompose) { "docker compose" } else { "docker-compose" }
    $composeFile = "docker-compose.test.yml"
    
    # ========================================================================
    # 2. 切换到项目根目录
    # ========================================================================
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Push-Location $projectRoot
    
    if (-not (Test-Path $composeFile)) {
        Write-Error-Custom "测试环境配置文件 $composeFile 不存在"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 3. 检查测试环境配置文件
    # ========================================================================
    Write-Info "检查测试环境配置文件..."
    
    $testEnvFile = ".env.test"
    if (-not (Test-Path $testEnvFile)) {
        Write-Warning-Custom "测试环境配置文件 $testEnvFile 不存在"
        Write-Info "正在创建测试环境配置文件..."
        
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" $testEnvFile
            Write-Success "已创建 $testEnvFile 文件"
            Write-Info "请先配置 $testEnvFile 文件后再重新运行部署脚本"
            Pop-Location
            exit 0
        }
        else {
            Write-Error-Custom "示例配置文件 .env.example 不存在"
            Pop-Location
            exit 1
        }
    }
    else {
        Write-Success "测试环境配置文件已存在"
    }
    
    # ========================================================================
    # 4. 构建测试镜像
    # ========================================================================
    Write-Info "构建测试环境 Docker 镜像..."
    Write-Host "这可能需要几分钟时间，请耐心等待..." -ForegroundColor Yellow
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile build app"
        if ($LASTEXITCODE -ne 0) {
            throw "镜像构建失败"
        }
        Write-Success "应用镜像构建完成"
    }
    catch {
        Write-Error-Custom "应用镜像构建失败: $_"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 5. 启动所有测试服务
    # ========================================================================
    Write-Info "启动所有测试环境服务..."
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile up -d"
        if ($LASTEXITCODE -ne 0) {
            throw "服务启动失败"
        }
        Write-Success "所有服务启动完成"
    }
    catch {
        Write-Error-Custom "服务启动失败: $_"
        Invoke-Expression "$composeCmd -f $composeFile down"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 6. 等待服务完全启动
    # ========================================================================
    Write-Info "等待服务完全启动（30秒）..."
    
    for ($i = 1; $i -le 30; $i++) {
        Write-Progress -Activity "等待服务启动" -Status "已等待 $i 秒" -PercentComplete (($i / 30) * 100)
        Start-Sleep -Seconds 1
    }
    Write-Progress -Activity "等待服务启动" -Completed
    Write-Success "服务已就绪"
    
    # ========================================================================
    # 7. 检查服务状态
    # ========================================================================
    Write-Info "检查服务运行状态..."
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile ps"
        Write-Success "服务状态正常"
    }
    catch {
        Write-Warning-Custom "无法获取服务状态"
    }
    
    # ========================================================================
    # 8. 运行数据库迁移
    # ========================================================================
    Write-Info "运行测试环境数据库迁移..."
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile exec -T app pnpm prisma migrate deploy"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "数据库迁移完成"
        }
        else {
            Write-Warning-Custom "数据库迁移失败，请检查日志"
        }
    }
    catch {
        Write-Warning-Custom "数据库迁移执行失败: $_"
    }
    
    # ========================================================================
    # 9. 填充测试种子数据
    # ========================================================================
    Write-Info "填充测试环境种子数据..."
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile exec -T app pnpm db:seed:test"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "种子数据填充完成"
        }
        else {
            Write-Warning-Custom "种子数据填充失败"
        }
    }
    catch {
        Write-Warning-Custom "种子数据填充执行失败: $_"
    }
    
    # ========================================================================
    # 10. 显示部署完成信息
    # ========================================================================
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "🎉 测试环境部署完成！" -ForegroundColor Green
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 服务信息:" -ForegroundColor Cyan
    Write-Host "   🌐 应用地址:    http://localhost:8001" -ForegroundColor White
    Write-Host "   📚 API 文档:    http://localhost:8001/api/docs" -ForegroundColor White
    Write-Host "   🗄️  数据库端口:  localhost:3307" -ForegroundColor White
    Write-Host "   📊 Redis 端口:  localhost:6380" -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 常用管理命令:" -ForegroundColor Cyan
    Write-Host "   查看服务状态:  $composeCmd -f $composeFile ps" -ForegroundColor White
    Write-Host "   查看实时日志:  $composeCmd -f $composeFile logs -f" -ForegroundColor White
    Write-Host "   重启所有服务:  $composeCmd -f $composeFile restart" -ForegroundColor White
    Write-Host "   停止所有服务:  $composeCmd -f $composeFile stop" -ForegroundColor White
    Write-Host "   停止并删除:    $composeCmd -f $composeFile down" -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    
    $viewLogs = Read-Host "是否查看服务日志？(y/N)"
    if ($viewLogs -eq "y" -or $viewLogs -eq "Y") {
        Write-Info "显示服务日志（按 Ctrl+C 退出）..."
        Start-Sleep -Seconds 2
        Invoke-Expression "$composeCmd -f $composeFile logs -f"
    }
}
catch {
    Write-Error-Custom "部署失败: $_"
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
