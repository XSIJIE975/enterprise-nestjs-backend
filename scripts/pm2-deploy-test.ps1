# ============================================================================
# 企业级 NestJS 后端系统 - PM2 测试环境部署脚本 (PowerShell)
# ============================================================================
# 描述: 用于测试环境的 PM2 自动化部署脚本 (Windows)
# 用法: .\scripts\pm2-deploy-test.ps1
# 支持: Windows PowerShell 5.1+ / PowerShell 7+
# ============================================================================

$ErrorActionPreference = "Stop"

# ============================================================================
# 辅助函数
# ============================================================================

function Print-Title {
    param([string]$Message)
    Write-Host ""
    Write-Host "🚀 $Message" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor Blue
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# ============================================================================
# 主脚本开始
# ============================================================================

Print-Title "企业级 NestJS 后端系统 - PM2 测试环境部署"

# ============================================================================
# 1. 检查环境依赖
# ============================================================================
Print-Info "检查环境依赖..."

if (-not (Test-CommandExists node)) {
    Print-Error "未安装 Node.js，请先安装 Node.js 22.x+"
    exit 1
}

$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 22) {
    Print-Error "Node.js 版本过低 (当前: $(node -v))，需要 v22.0.0+"
    exit 1
}
Print-Success "Node.js 版本检查通过: $(node -v)"

if (-not (Test-CommandExists pnpm)) {
    Print-Error "未安装 pnpm，请先安装 pnpm"
    exit 1
}
Print-Success "pnpm 版本: $(pnpm -v)"

if (-not (Test-CommandExists pm2)) {
    Print-Error "未安装 PM2，请先安装 PM2"
    exit 1
}
Print-Success "PM2 版本: $(pm2 -v)"

# ============================================================================
# 2. 检查配置文件
# ============================================================================
Print-Info "检查配置文件..."

if (-not (Test-Path ".env.test")) {
    Print-Error "缺少 .env.test 配置文件"
    exit 1
}
Print-Success ".env.test 配置文件存在"

if (-not (Test-Path "ecosystem.config.js")) {
    Print-Error "缺少 ecosystem.config.js PM2 配置文件"
    exit 1
}
Print-Success "ecosystem.config.js 配置文件存在"

# ============================================================================
# 3. 安装依赖
# ============================================================================
Print-Info "安装依赖..."
try {
    pnpm install
    Print-Success "依赖安装完成"
}
catch {
    Print-Error "依赖安装失败: $_"
    exit 1
}

# ============================================================================
# 4. 构建项目
# ============================================================================
Print-Info "构建项目..."
try {
    pnpm build
    Print-Success "项目构建完成"
}
catch {
    Print-Error "项目构建失败: $_"
    exit 1
}

if (-not (Test-Path "dist")) {
    Print-Error "构建产物 dist 目录不存在"
    exit 1
}
Print-Success "构建产物检查通过"

# ============================================================================
# 5. 数据库迁移
# ============================================================================
Print-Info "执行数据库迁移..."
Write-Host ""
$migrateConfirm = Read-Host "是否执行数据库迁移？(y/n)"

if ($migrateConfirm -eq "y" -or $migrateConfirm -eq "Y") {
    try {
        pnpm db:migrate:deploy:test
        Print-Success "数据库迁移完成"
    }
    catch {
        Print-Error "数据库迁移失败: $_"
        exit 1
    }
}
else {
    Print-Warning "跳过数据库迁移"
}

# ============================================================================
# 6. 启动/重载 PM2 应用
# ============================================================================
Print-Info "部署 PM2 应用..."

$appExists = $false
try {
    $pmDescription = pm2 describe nest-api-test 2>&1
    if ($LASTEXITCODE -eq 0) {
        $appExists = $true
    }
}
catch {
    $appExists = $false
}

try {
    if ($appExists) {
        Print-Info "检测到已存在的应用，执行零停机重载..."
        pm2 reload ecosystem.config.js --env test --only nest-api-test
        Print-Success "应用重载完成 (零停机部署)"
    }
    else {
        Print-Info "首次部署，启动应用..."
        pm2 start ecosystem.config.js --env test --only nest-api-test
        Print-Success "应用启动完成"
    }
}
catch {
    Print-Error "PM2 部署失败: $_"
    exit 1
}

# ============================================================================
# 7. 保存 PM2 配置
# ============================================================================
Print-Info "保存 PM2 配置..."
try {
    pm2 save
    Print-Success "PM2 配置已保存"
}
catch {
    Print-Error "PM2 配置保存失败: $_"
    exit 1
}

# ============================================================================
# 8. 健康检查
# ============================================================================
Print-Info "等待应用启动..."
Start-Sleep -Seconds 5

Print-Info "执行健康检查..."

$port = "8001"
if (Test-Path ".env.test") {
    $envContent = Get-Content ".env.test" | Where-Object { $_ -match "^PORT=" }
    if ($envContent) {
        $port = $envContent.Split('=')[1].Trim()
    }
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Print-Success "健康检查通过！应用运行正常"
    }
    else {
        Print-Warning "健康检查返回异常状态码: $($response.StatusCode)"
        Write-Host "查看日志: pm2 logs nest-api-test"
    }
}
catch {
    Print-Warning "健康检查失败，请检查应用日志"
    Write-Host "查看日志: pm2 logs nest-api-test"
}

# ============================================================================
# 9. 显示应用状态
# ============================================================================
Write-Host ""
Print-Title "部署完成！应用状态如下："
pm2 status

Write-Host ""
Print-Title "常用命令："
Write-Host "  查看日志:   pm2 logs nest-api-test"
Write-Host "  查看监控:   pm2 monit"
Write-Host "  重启应用:   pm2 restart nest-api-test"
Write-Host "  停止应用:   pm2 stop nest-api-test"
Write-Host "  删除应用:   pm2 delete nest-api-test"
Write-Host ""

Print-Success "🎉 测试环境部署完成！"
