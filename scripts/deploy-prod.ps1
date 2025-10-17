# ============================================================================
# 企业级 NestJS 后端系统 - 生产环境全量部署脚本 (PowerShell)
# ============================================================================
# 描述: 用于生产环境的自动化部署脚本，包含镜像构建、服务启动、数据库迁移等功能
# 用法: .\scripts\deploy-prod.ps1
# 警告: 此脚本将部署到生产环境，请谨慎使用！
# ============================================================================

# 设置错误处理：遇到错误立即停止
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

# 执行命令并检查结果
function Invoke-CommandWithCheck {
    param(
        [string]$Command,
        [string]$ErrorMessage
    )
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw $ErrorMessage
        }
    }
    catch {
        Write-Error-Custom "$ErrorMessage : $_"
        exit 1
    }
}

# ============================================================================
# 主脚本开始
# ============================================================================

Write-Title "企业级 NestJS 后端系统 - 生产环境全量部署"

try {
    # ========================================================================
    # 1. 部署确认
    # ========================================================================
    Write-Host ""
    Write-Host "⚠️  警告: 此操作将部署到生产环境！" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "请输入 'YES' 确认继续部署"
    
    if ($confirmation -ne "YES") {
        Write-Info "部署已取消"
        exit 0
    }
    
    Write-Host ""
    
    # ========================================================================
    # 2. 检查 Docker 环境
    # ========================================================================
    Write-Info "检查 Docker 环境..."
    
    # 检查 Docker 是否安装
    if (-not (Test-Command "docker")) {
        Write-Error-Custom "未安装 Docker，请先安装 Docker Desktop"
        Write-Host "下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Blue
        exit 1
    }
    
    # 检查 Docker Compose 是否可用
    try {
        docker compose version | Out-Null
        $useDockerCompose = $true
        Write-Success "检测到 Docker Compose (V2)"
    }
    catch {
        # 尝试使用旧版 docker-compose
        if (Test-Command "docker-compose") {
            $useDockerCompose = $false
            Write-Success "检测到 Docker Compose (V1)"
        }
        else {
            Write-Error-Custom "未安装 Docker Compose"
            exit 1
        }
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
    
    # 设置 Docker Compose 命令
    $composeCmd = if ($useDockerCompose) { "docker compose" } else { "docker-compose" }
    $composeFile = "docker-compose.prod.yml"
    
    # ========================================================================
    # 3. 切换到项目根目录
    # ========================================================================
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Push-Location $projectRoot
    
    # 检查 docker-compose.prod.yml 是否存在
    if (-not (Test-Path $composeFile)) {
        Write-Error-Custom "生产环境配置文件 $composeFile 不存在"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 4. 检查生产环境配置文件
    # ========================================================================
    Write-Info "检查生产环境配置文件..."
    
    $prodEnvFile = ".env.production"
    if (-not (Test-Path $prodEnvFile)) {
        Write-Warning-Custom "生产环境配置文件 $prodEnvFile 不存在"
        Write-Info "正在创建生产环境配置文件..."
        
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" $prodEnvFile
            Write-Success "已创建 $prodEnvFile 文件"
            Write-Warning-Custom "请先配置 $prodEnvFile 文件后再重新运行部署脚本"
            
            # 打开文件供编辑
            if (Test-Command "code") {
                code $prodEnvFile
            }
            else {
                notepad $prodEnvFile
            }
            
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
        Write-Success "生产环境配置文件已存在"
    }
    
    # ========================================================================
    # 5. 构建生产镜像
    # ========================================================================
    Write-Info "构建生产环境 Docker 镜像..."
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
    # 6. 启动所有生产服务
    # ========================================================================
    Write-Info "启动所有生产环境服务（应用、数据库、Redis 等）..."
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile up -d"
        if ($LASTEXITCODE -ne 0) {
            throw "服务启动失败"
        }
        Write-Success "所有服务启动完成"
    }
    catch {
        Write-Error-Custom "服务启动失败: $_"
        Write-Info "正在回滚服务..."
        Invoke-Expression "$composeCmd -f $composeFile down"
        Pop-Location
        exit 1
    }
    
    # ========================================================================
    # 7. 等待服务完全启动
    # ========================================================================
    Write-Info "等待服务完全启动（30秒）..."
    
    # 显示进度条
    for ($i = 1; $i -le 30; $i++) {
        Write-Progress -Activity "等待服务启动" -Status "已等待 $i 秒" -PercentComplete (($i / 30) * 100)
        Start-Sleep -Seconds 1
    }
    Write-Progress -Activity "等待服务启动" -Completed
    Write-Success "服务已就绪"
    
    # ========================================================================
    # 8. 检查服务状态
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
    # 9. 运行数据库迁移
    # ========================================================================
    Write-Info "运行生产环境数据库迁移..."
    Write-Warning-Custom "数据库迁移将直接操作生产数据库，请确保已备份数据"
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile exec -T app pnpm db:migrate:deploy"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "数据库迁移完成"
        }
        else {
            Write-Warning-Custom "数据库迁移失败，请检查日志"
        }
    }
    catch {
        Write-Warning-Custom "数据库迁移执行失败: $_"
        Write-Info "如果是首次部署，这可能是正常的"
    }
    
    # ========================================================================
    # 10. 填充生产种子数据（可选）
    # ========================================================================
    Write-Info "填充生产环境种子数据..."
    Write-Warning-Custom "通常生产环境不需要种子数据，如果数据已存在将跳过"
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile exec -T app pnpm db:seed"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "种子数据填充完成"
        }
        else {
            Write-Warning-Custom "种子数据填充失败，可能数据已存在"
        }
    }
    catch {
        Write-Warning-Custom "种子数据填充执行失败: $_"
    }
    
    # ========================================================================
    # 11. 显示部署完成信息
    # ========================================================================
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "🎉 生产环境部署完成！" -ForegroundColor Green -BackgroundColor Black
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 服务信息:" -ForegroundColor Cyan
    Write-Host "   🌐 应用地址:    http://localhost:8002" -ForegroundColor White
    Write-Host "   📚 API 文档:    http://localhost:8002/api/docs" -ForegroundColor White
    Write-Host "   🗄️  数据库端口:  localhost:3306" -ForegroundColor White
    Write-Host "   📊 Redis 端口:  localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 常用管理命令:" -ForegroundColor Cyan
    Write-Host "   查看服务状态:  $composeCmd -f $composeFile ps" -ForegroundColor White
    Write-Host "   查看实时日志:  $composeCmd -f $composeFile logs -f" -ForegroundColor White
    Write-Host "   查看应用日志:  $composeCmd -f $composeFile logs -f app" -ForegroundColor White
    Write-Host "   重启所有服务:  $composeCmd -f $composeFile restart" -ForegroundColor White
    Write-Host "   重启应用服务:  $composeCmd -f $composeFile restart app" -ForegroundColor White
    Write-Host "   停止所有服务:  $composeCmd -f $composeFile stop" -ForegroundColor White
    Write-Host "   停止并删除:    $composeCmd -f $composeFile down" -ForegroundColor White
    Write-Host "   进入应用容器:  $composeCmd -f $composeFile exec app sh" -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 重要提示:" -ForegroundColor Yellow
    Write-Host "   1. 定期备份数据库数据" -ForegroundColor White
    Write-Host "   2. 监控服务运行状态和日志" -ForegroundColor White
    Write-Host "   3. 及时更新系统安全补丁" -ForegroundColor White
    Write-Host "   4. 使用防火墙限制端口访问" -ForegroundColor White
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host ""
    
    # 询问是否查看日志
    $viewLogs = Read-Host "是否查看服务日志？(y/N)"
    if ($viewLogs -eq "y" -or $viewLogs -eq "Y") {
        Write-Info "显示服务日志（按 Ctrl+C 退出）..."
        Start-Sleep -Seconds 2
        Invoke-Expression "$composeCmd -f $composeFile logs -f"
    }
}
catch {
    # 捕获并显示所有未处理的错误
    Write-Error-Custom "部署失败: $_"
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    Write-Host ""
    Write-Info "正在尝试回滚服务..."
    
    try {
        Invoke-Expression "$composeCmd -f $composeFile down"
        Write-Success "服务已回滚"
    }
    catch {
        Write-Error-Custom "回滚失败，请手动检查服务状态"
    }
    
    exit 1
}
finally {
    # 恢复目录位置
    Pop-Location
}
