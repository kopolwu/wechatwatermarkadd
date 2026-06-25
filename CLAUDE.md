# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

照片水印处理微信小程序，支持两个功能模块，通过顶部 TAB 切换：
1. **图片加水印**：上传图片，平铺文字水印，预览后保存到相册或分享
2. **视频去水印**：粘贴视频分享链接，通过云托管代理解析，下载无水印视频

## 技术栈

- **框架**：微信小程序，采用 Glass-Easel 组件框架 + Skyline 渲染引擎
- **语言**：TypeScript + SCSS (Sass)
- **基础库版本**：v2.32.3
- **云服务**：微信云托管（`wx.cloud.callContainer`），无需配置公网域名
- **云托管后端**：Python Flask，见 `D:\WeChatProjects\xiaoboweixin`
- **开发方式**：需使用微信开发者工具 IDE，无 CLI 构建步骤。TypeScript 和 SCSS 由 IDE 编译器插件自动编译。

## 项目结构

```
miniprogram/
  app.ts / app.json / app.scss        — 应用入口、全局配置、全局样式
  app.ts 中 wx.cloud.init()           — 云开发初始化（env: prod-d5gom78c0baa72fbe）
  pages/index/                        — 主页面（TAB 切换：图片加水印 / 视频去水印）
  pages/logs/                         — 日志页面（模板代码）
  components/navigation-bar/          — 自定义导航栏（WeUI 风格），处理刘海屏安全区域适配
  utils/
    util.ts                           — 公共工具函数（formatTime）
    vediodb.ts                        — 视频去水印：通过 callContainer 调用云托管 /api/vediodb/parse
    md5.ts                            — 纯 JS MD5 实现（供签名场景复用）
typings/                              — 微信 API 类型声明（含 callContainer 补充声明）
project.config.json                   — 微信开发者工具项目配置
tsconfig.json                         — TypeScript 配置（strict、ES2020、CommonJS）
```

## 架构要点

### 页面架构

- **Component 模式**：页面使用 `Component()` 而非 `Page()`，每个 `.ts` 文件定义 Component，包含 `data`、`methods`、`lifetimes`。
- **TAB 切换**：`activeTab` 控制 `'watermark'` / `'vediodb'` 两个 TAB，通过 `wx:if` 切换内容区域。

### 图片加水印（watermark TAB）

使用隐藏的离屏 `<canvas>` 合成水印：
1. `wx.chooseImage` / `wx.chooseMessageFile` 上传图片
2. `addTiledWatermark()` 在隐藏 canvas 上绘制原图，以 30° 旋转角、150px 间距平铺水印文字
3. `wx.canvasToTempFilePath()` 导出为临时 PNG
4. 临时文件存入 `processedFileInfo`，`<image>` 渲染预览
5. `wx.saveImageToPhotosAlbum` / `wx.showShareImageMenu` 保存/分享

图片预览容器高度限制为屏幕安全区域的 50%，点击图片切换全屏缩放。水印字体 12-72px，步长 2px。

### 视频去水印（vediodb TAB）

**请求链路**：
```
小程序 wx.cloud.callContainer
  → 云托管 POST /api/vediodb/parse {url}
  → Python 服务端 MD5 签名 + POST qsy.lmengcity.com
  → 返回无水印视频/图片链接
  → 小程序展示预览 + 下载
```

**签名逻辑**（服务端完成，客户端不参与）：
1. `generateNonceStr(16)` + `timestamp(秒)` + `encodeURIComponent(url)`
2. 拼接 `nonceStr={x}&timestamp={t}&url={encoded}` → MD5 → sign
3. POST body: `{timestamp, url, openid, url_text, nonceStr, sign}`

**视频下载**：遍历 `url_bk → url_dl → url` 逐个尝试下载，失败自动切换备用链接，通过 `wx.downloadFile` + `wx.saveVideoToPhotosAlbum` 保存。

### 导航栏

`navigation-bar` 组件替代系统导航栏（`navigationStyle: "custom"`），通过 `wx.getSystemInfo` + `wx.getMenuButtonBoundingClientRect` 动态适配刘海屏。

## 调用云托管（callContainer）

```typescript
wx.cloud.callContainer({
  config: { env: 'prod-d5gom78c0baa72fbe' },
  path: '/api/vediodb/parse',
  header: { 'X-WX-SERVICE': 'flask-dyg3' },
  method: 'POST',
  data: { url: videoUrl },
})
```

使用 `callContainer` 无需配置 request 合法域名，微信内部服务发现直接访问。需在 `app.ts` 中预先调用 `wx.cloud.init({ env })`。

## 云托管后端项目

位置：`D:\WeChatProjects\xiaoboweixin`

Python Flask 项目，关键文件：
- `wxcloudrun/vediodb_proxy.py` — 签名 + 上游 API 代理（`parse_vediodb_url`）
- `wxcloudrun/views.py` — 路由 `POST /api/vediodb/parse`（同时支持 GET）
- `requirements.txt` — 依赖含 `requests==2.27.1`

代理与 JS 版 `server.js` 的关键差异已对齐：URL 编码用 `quote(url, safe="")`、`allow_redirects=False`、禁用 `User-Agent`/`Accept-Encoding` 默认头。

## 使用的核心微信 API

| API | 用途 |
|-----|------|
| `wx.chooseImage` / `wx.chooseMessageFile` | 图片上传（相册/聊天） |
| `wx.getImageInfo` | 获取原始图片尺寸 |
| `wx.createCanvasContext` | 2D Canvas 水印合成 |
| `wx.canvasToTempFilePath` | Canvas 导出临时图片 |
| `wx.saveImageToPhotosAlbum` | 图片/视频保存到相册 |
| `wx.saveVideoToPhotosAlbum` | 视频保存到相册 |
| `wx.showShareImageMenu` | 分享图片到微信会话 |
| `wx.downloadFile` | 下载远程视频/图片文件 |
| `wx.getClipboardData` / `wx.setClipboardData` | 剪贴板读写 |
| `wx.cloud.init` / `wx.cloud.callContainer` | 云开发初始化 + 云托管调用 |
| `wx.getSystemInfo` | 屏幕/安全区域尺寸 |
| `wx.getMenuButtonBoundingClientRect` | 胶囊按钮定位 |
| `wx.getFileSystemManager` | 文件系统操作 |

## 开发说明

- 在**微信开发者工具**中打开项目根目录开发和预览
- TypeScript 和 SCSS 由 IDE 编译器插件自动编译，无需手动构建
- 项目未配置测试框架，无 lint/test 脚本
- npm 依赖仅 `miniprogram-api-typings`（devDependency），克隆后运行 `npm install`
- 类型补充声明在 `typings/types/wx/lib.wx.cloud.d.ts`（`callContainer` 方法）
- 代码中**避免使用可选链 `?.`**，微信编译器不支持该语法
