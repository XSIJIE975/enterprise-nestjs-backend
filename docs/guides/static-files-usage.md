# 静态文件目录

此目录用于存放应用的静态资源文件。

## 目录说明

- `favicon.ico` - 网站图标
- `robots.txt` - 搜索引擎爬虫配置

## 访问方式

静态文件可以直接从根路径访问：

- `http://localhost:8000/favicon.ico`
- `http://localhost:8000/robots.txt`

## 添加新的静态文件

1. 将文件放入 `public` 目录
2. 重启应用
3. 通过 `http://localhost:8000/<文件名>` 访问

## 注意事项

- 静态文件路径优先级高于 API 路由
- 避免静态文件名与 API 路由冲突
- 生产环境建议使用 CDN 或 Nginx 托管静态文件
