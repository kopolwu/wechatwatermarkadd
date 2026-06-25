# 照片水印处理小程序

微信小程序，支持**图片加水印**和**视频去水印**两大功能。

## 功能

### 📷 图片加水印
- 从相册或聊天会话选择图片
- 自定义水印文字、颜色（6色）、字体大小（12-72px）
- 30° 旋转角平铺水印，实时预览效果
- 点击图片全屏缩放查看
- 保存到相册 / 分享到微信会话
- 上传即自动内容安全检测（接入微信 `security.imgSecCheck`）

### 🎬 视频去水印
- 粘贴视频分享链接，一键解析
- 通过云托管代理解析，获取无水印视频/图片
- 支持视频保存、图片保存、链接复制

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | 微信小程序（Glass-Easel + Skyline 渲染引擎） |
| 语言 | TypeScript + SCSS |
| 基础库 | v2.32.3 |
| 云服务 | 微信云开发 + 云托管（`callContainer`） |
| 后端 | Python Flask（独立项目） |

## 项目结构

```
├── miniprogram/
│   ├── app.ts / app.json / app.scss    # 应用入口、全局配置
│   ├── pages/index/                    # 主页面（TAB 切换）
│   ├── components/navigation-bar/      # 自定义导航栏
│   ├── utils/
│   │   ├── vediodb.ts                  # 视频去水印 API 调用
│   │   └── md5.ts                      # MD5 工具
│   └── typings/                        # 微信 API 类型声明
├── cloudfunctions/                     # 云函数（如有）
├── project.config.json                 # 微信开发者工具配置
├── tsconfig.json
└── 图片安全检测方案.md                  # 内容安全检测方案文档
```

## 快速开始

1. 微信开发者工具打开项目根目录
2. 运行 `npm install`（仅 typings 依赖）
3. 在 IDE 中编译预览

> TypeScript 和 SCSS 由 IDE 编译器插件自动编译，无需手动构建。

## 图片安全检测架构

图片在端上处理，不上传服务器。通过**云存储中转**方式接入微信内容安全 API：

```
选择图片 → compressImage → 上传云存储 → 获取临时URL → callContainer
  → Flask 下载 → 微信 imgSecCheck → 返回结果
  → 安全：继续端上水印 / 违规：阻断提示
```

详见 [图片安全检测方案.md](图片安全检测方案.md)

## 云托管后端

位置：`D:\WeChatProjects\xiaoboweixin`（Python Flask）

关键端点：
- `POST /api/vediodb/parse` — 视频去水印解析
- `POST /api/imgSecCheck` — 图片内容安全检测

环境变量（云托管控制台配置）：
- `WX_APPID` — 小程序 AppID
- `WX_APPSECRET` — 小程序 AppSecret
