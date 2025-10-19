# 如何添加真实的 Favicon

当前 `favicon.ico` 是一个占位文件。要替换为真实的图标，请按照以下步骤操作：

## 方法 1: 使用在线 Favicon 生成器（推荐）

### 步骤：

1. **访问 Favicon 生成器网站**
   - [favicon.io](https://favicon.io/) - 可以从文本、图片或 emoji 生成
   - [realfavicongenerator.net](https://realfavicongenerator.net/) - 功能最全面
   - [favicon.cc](https://www.favicon.cc/) - 像素风格绘制

2. **生成或上传图标**
   - 上传你的 logo 图片（建议 512x512 px 或更大）
   - 或使用文本/emoji 生成

3. **下载生成的文件**
   - 下载 `favicon.ico` 文件
   - 某些生成器还会生成多种尺寸的 PNG 文件

4. **替换文件**

   ```bash
   # 将下载的 favicon.ico 复制到 public 目录
   # Windows
   copy path\to\downloaded\favicon.ico public\favicon.ico

   # Linux/Mac
   cp path/to/downloaded/favicon.ico public/favicon.ico
   ```

5. **重启应用**
   ```bash
   pnpm start:dev
   ```

## 方法 2: 使用 Photoshop/GIMP 制作

### 步骤：

1. **创建图标**
   - 打开 Photoshop 或 GIMP
   - 创建 32x32 px 或 64x64 px 的图像
   - 设计你的图标

2. **导出为 ICO 格式**
   - Photoshop: 需要安装 ICO 插件
   - GIMP: 直接支持导出 .ico 格式
   - 文件 → 导出为 → 选择 .ico 格式

3. **替换文件**（同上）

## 方法 3: 从 PNG 转换为 ICO

如果你已经有 PNG 图片：

1. **访问在线转换工具**
   - [cloudconvert.com](https://cloudconvert.com/png-to-ico)
   - [convertio.co](https://convertio.co/png-ico/)

2. **上传 PNG 文件**
   - 建议使用正方形图片（推荐 256x256 px）

3. **下载 ICO 文件**
   - 替换到 `public/favicon.ico`

## 高级配置: 多尺寸图标支持

如果你想支持各种设备和浏览器，可以添加多种尺寸的图标：

### 1. 生成多尺寸图标

使用 [realfavicongenerator.net](https://realfavicongenerator.net/) 生成完整的图标包。

### 2. 将文件放入 public 目录

```
public/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
└── site.webmanifest
```

### 3. 更新 index.html

在 `public/index.html` 的 `<head>` 中添加：

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

## 快速生成示例（使用 emoji）

最简单的方式是使用 emoji 作为临时图标：

1. 访问 https://favicon.io/emoji-favicons/
2. 选择一个 emoji（例如 🚀）
3. 下载并解压
4. 将 `favicon.ico` 复制到 `public/` 目录

## 验证

替换后，访问以下 URL 验证：

- http://localhost:8000/favicon.ico - 应该显示你的图标
- http://localhost:8000/ - 浏览器标签页应该显示图标

如果图标没有立即更新，请：

1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 强制刷新（Ctrl+F5）
3. 重启浏览器

## 注意事项

- ✅ ICO 格式支持最广泛
- ✅ 建议同时提供 16x16 和 32x32 尺寸
- ✅ 图标应该简洁，在小尺寸下清晰可见
- ⚠️ 避免过于复杂的细节
- ⚠️ 文件大小建议小于 100KB
