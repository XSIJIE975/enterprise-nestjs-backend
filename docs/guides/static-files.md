# 静态文件服务配置

> 如何在 NestJS 中配置和使用静态文件服务

## 概述

本项目已配置静态文件服务，用于托管 favicon、robots.txt 等静态资源。

## 配置说明

### 目录结构

```
public/
├── favicon.ico                  # 网站图标
├── robots.txt                   # 搜索引擎爬虫配置
└── index.html                   # 欢迎页面
```

### 代码配置

在 `src/main.ts` 中配置：

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/', // 从根路径访问
  });

  // ... 其他配置
}
```

## 访问方式

静态文件可以直接从根路径访问：

| 文件          | URL                                 | 说明     |
| ------------- | ----------------------------------- | -------- |
| `favicon.ico` | `http://localhost:8000/favicon.ico` | 网站图标 |
| `robots.txt`  | `http://localhost:8000/robots.txt`  | 爬虫规则 |
| `index.html`  | `http://localhost:8000/`            | 欢迎页面 |

## 添加新的静态文件

### 步骤 1: 添加文件

将文件放入 `public/` 目录：

```bash
# Windows
copy your-file.png public\

# Linux/Mac
cp your-file.png public/
```

### 步骤 2: 访问文件

```
http://localhost:8000/your-file.png
```

### 步骤 3: Git 提交

静态文件默认会被 Git 跟踪（除了 `public/uploads/` 等动态上传目录）：

```bash
git add public/your-file.png
git commit -m "feat: add static file"
```

## 常见用途

### 1. Favicon（网站图标）

参考 `public/HOW-TO-ADD-FAVICON.md` 了解如何添加。

### 2. robots.txt（搜索引擎配置）

```txt
# public/robots.txt
User-agent: *
Disallow: /api/
Allow: /
```

### 3. 欢迎页面

`public/index.html` 作为根路径的欢迎页面。

### 4. 其他静态资源

- 图片: `public/images/logo.png`
- 字体: `public/fonts/custom-font.woff2`
- 样式: `public/css/style.css`
- 脚本: `public/js/script.js`

## 路由优先级

静态文件服务的优先级：

1. ✅ **静态文件** - 如果 `public/` 中存在同名文件
2. ✅ **API 路由** - 如果匹配 API 路由
3. ✅ **全局前缀** - `api/v1/*` 路由

**注意**: 避免静态文件名与 API 路由冲突！

### 示例

```
/favicon.ico        → public/favicon.ico (静态文件)
/api/v1/users       → UsersController (API 路由)
/some-page          → public/some-page (如果存在) 否则 404
```

## 性能优化

### 开发环境

开发环境下，静态文件由 NestJS 直接托管（当前配置）。

### 生产环境建议

生产环境建议使用 Nginx 托管静态文件以获得更好的性能：

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name example.com;

    # 静态文件
    location ~ \.(ico|txt|html|css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf)$ {
        root /var/www/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 请求转发到 NestJS
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 使用 CDN

对于大型项目，建议将静态资源上传到 CDN：

```typescript
// 在响应中使用 CDN URL
const cdnUrl = process.env.CDN_URL || '';
const faviconUrl = `${cdnUrl}/favicon.ico`;
```

## 安全考虑

### 1. 限制文件类型

只托管安全的文件类型，避免上传可执行文件。

### 2. 分离用户上传

用户上传的文件应放在单独的目录：

```
public/
├── favicon.ico          # ✅ 静态资源（Git 跟踪）
├── uploads/            # ❌ 用户上传（Git 忽略）
│   └── user-file.png
```

在 `.gitignore` 中：

```gitignore
# 忽略用户上传的文件
public/uploads/
public/tmp/
public/temp/
```

### 3. 文件大小限制

在上传接口中添加文件大小限制：

```typescript
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  })
)
uploadFile(@UploadedFile() file: Express.Multer.File) {
  // 处理上传
}
```

## 调试

### 检查静态文件路径

```typescript
import { join } from 'path';

console.log('Static files path:', join(__dirname, '..', 'public'));
// 输出: D:\Code\nest-proejct\dist\public
```

### 验证文件是否存在

```bash
# Windows
dir public\favicon.ico

# Linux/Mac
ls -la public/favicon.ico
```

### 测试访问

```bash
# 使用 curl
curl http://localhost:8000/favicon.ico

# 使用浏览器
# 打开 http://localhost:8000/favicon.ico
```

## 故障排除

### 问题 1: 404 Not Found

**原因**: 文件不存在或路径错误

**解决**:

1. 检查文件是否在 `public/` 目录
2. 检查文件名拼写
3. 重启应用

### 问题 2: 缓存问题

**原因**: 浏览器缓存了旧版本

**解决**:

1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 强制刷新（Ctrl+F5）
3. 使用隐私模式测试

### 问题 3: MIME 类型错误

**原因**: Express 无法识别文件类型

**解决**:

```typescript
// 在 main.ts 中添加自定义 MIME 类型
import * as mime from 'mime-types';

mime.types['custom'] = 'application/x-custom';
```

## 相关资源

- [NestJS Static Assets](https://docs.nestjs.com/techniques/mvc#static-assets)
- [Express Static](https://expressjs.com/en/starter/static-files.html)
- [Favicon Generator](https://favicon.io/)
- [Nginx Static Files](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)

---

**更新日期**: 2025-10-18
