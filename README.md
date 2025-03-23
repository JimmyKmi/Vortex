# VORTËX - 文件快传

[English](README_en.md) | 简体中文

> 📝 该文档由 LLM 生成，如有纰漏请提 [Issue](https://github.com/JimmyKmi/vortex/issues)

![Docker Pulls](https://img.shields.io/docker/pulls/jimmykmi/vortex)
![Docker Latest Version](https://img.shields.io/docker/v/jimmykmi/vortex/latest)
![License](https://img.shields.io/github/license/JimmyKmi/vortex)

> ⚠️ **Beta 版提示**：VORTËX 目前处于 Beta 开发阶段，可能存在不稳定性。建议仅用于测试和个人用途，暂不建议用于生产环境。

VORTËX 是一个高效、简洁的文件传输平台，专为快速文件分享与协作设计。基于现代 Web 技术栈构建，提供安全可靠的文件共享服务。

> 🌟 喜欢这个项目？点个 Star 呗！这对我们真的很重要，就像咖啡对程序员一样重要~

## 📚 项目文档

- [部署指南](docs/DEPLOYMENT.md) - 详细的部署和配置说明
- [开发指南](docs/DEVELOPMENT.md) - 开发环境设置和工作流程
- [贡献指南](docs/CONTRIBUTING.md) - 如何参与项目开发
- [项目 Wiki](https://github.com/JimmyKmi/vortex/wiki) - 更多详细文档

## ✨ 核心特性

- **简单高效的文件传输**：支持拖拽上传，保留目录结构
- **无需注册即可使用**：使用传输码快速分享和接收文件
- **灵活的共享控制**：自定义下载权限和分享参数
- **企业级身份验证**：支持 Zitadel SSO 和用户权限管理
- **现代化界面设计**：基于 Next.js 15 和 shadcn/ui 构建的响应式界面

## 🚀 快速部署

### Docker Compose 方式（推荐）

1. 创建部署目录并进入：

   ```bash
   mkdir vortex && cd vortex
   ```

2. 创建 `docker-compose.yml` 文件：

   ```yaml
   services:
     vortex:
       image: jimmykmi/vortex:latest # 或使用 dogfood 标签获取测试版
       env_file: ./.env
       container_name: vortex
       ports:
         - '21330:3000' # 将端口 21330 映射到容器的 3000 端口
       volumes:
         - ./data:/app/data # 持久化数据存储
       restart: unless-stopped
   ```

3. 从示例创建环境配置文件：

   ```bash
   # 下载环境变量模板并重命名
   curl -o .env https://raw.githubusercontent.com/JimmyKmi/vortex/main/.env.example

   # 编辑配置文件，设置必要的环境变量
   nano .env
   ```

4. 启动服务：

   ```bash
   docker-compose up -d
   ```

5. 访问服务：
   浏览器打开 `http://localhost:21330`

### Docker 标签说明

- `latest`: 最新稳定版本
- `dogfood`: 最新测试版本（包含实验性功能）
- `x.y.z`: 特定版本号

## 🛠️ 开发指南

### 环境准备

1. 克隆仓库并安装依赖：

   ```bash
   git clone https://github.com/JimmyKmi/vortex.git
   cd vortex
   npm install --legacy-peer-deps  # 使用 legacy-peer-deps 解决依赖兼容性问题
   ```

2. 配置环境变量（复制示例文件）：

   ```bash
   cp .env.example .env.local
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

### 常用开发命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run format` - 格式化代码
- `npm run check-lint` - 检查代码质量
- `npm run check-prettier` - 检查代码格式
- `npm run check-jest` - 运行测试

## 🤝 贡献指南

感谢您对 VORTËX 项目的兴趣！以下是参与贡献的步骤：

### 开发流程

1. Fork 仓库并克隆到本地
2. 创建新分支：`git checkout -b feature/your-feature-name`
3. 开发并测试您的功能
4. 确保代码通过所有检查：
   ```bash
   npm run check-lint
   npm run check-prettier
   npm run check-jest
   ```
