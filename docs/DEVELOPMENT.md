# VORTËX 开发指南

[English](DEVELOPMENT_en.md) | 简体中文

> 📝 该文档由 LLM 生成，如有纰漏请提 [Issue](https://github.com/JimmyKmi/vortex/issues)

本文档提供 VORTËX 项目的开发环境配置、测试和贡献流程说明。

## 开发环境设置

### 前置条件

- Node.js 20+
- npm 9+
- Git
- 基本的 Next.js 和 React 知识

### 环境准备

1. **克隆代码仓库**:
   ```bash
   git clone https://github.com/JimmyKmi/vortex.git
   cd vortex
   ```

2. **安装依赖**:
   ```bash
   # 使用 --legacy-peer-deps 解决依赖兼容性问题
   npm install --legacy-peer-deps
   ```

3. **配置环境变量**:
   ```bash
   # 复制环境变量模板
   cp .env.example .env.local
   
   # 编辑 .env.local 配置开发环境参数
   ```

4. **启动开发服务器**:
   ```bash
   npm run dev
   ```
   开发服务器将在 http://localhost:3000 启动。

## 项目结构

VORTËX 项目采用 Next.js App Router 架构，目录结构如下：

```
vortex/
├── app/                 # Next.js 应用目录
│   ├── api/             # API 路由
│   ├── (auth)/          # 身份验证相关页面
│   ├── dashboard/       # 管理面板页面
│   └── ...              # 其他页面和组件
├── components/          # 共享组件
├── contexts/            # React 上下文
├── hooks/               # 自定义 React Hooks
├── lib/                 # 工具函数和服务
│   ├── config/          # 应用配置
│   └── ...              # 其他工具库
├── prisma/              # Prisma ORM 模型和迁移
├── public/              # 静态资源
├── styles/              # 全局样式
└── types/               # TypeScript 类型定义
```

## 代码规范

项目使用 ESLint 和 Prettier 进行代码风格管理：

```bash
# 运行代码检查
npm run check-lint

# 格式化代码
npm run format

# 检查代码格式
npm run check-prettier
```

## 测试

项目使用 Jest 和 React Testing Library 进行测试：

```bash
# 运行所有测试
npm run check-jest

# 查看测试覆盖率报告
npm run check-jest -- --coverage
```

### 测试规范

1. 组件测试应放在靠近组件的 `__tests__` 目录中
2. API 端点测试应放在相应的 API 路由目录中
3. 单元测试文件应使用 `.test.ts` 或 `.test.tsx` 后缀
4. 集成测试文件应使用 `.spec.ts` 或 `.spec.tsx` 后缀

## 数据库迁移

项目使用 Prisma ORM 管理数据库模型和迁移：

```bash
# 生成迁移
npx prisma migrate dev --name <migration-name>

# 应用迁移
npx prisma migrate deploy

# 查看数据库
npx prisma studio
```

## 构建生产版本

```bash
# 构建生产版本
npm run build

# 本地测试生产版本
npm start
```

## CI/CD 流程

项目使用 GitHub Actions 进行持续集成和部署：

1. **代码质量检查**:
   - ESLint 代码检查
   - Prettier 格式检查
   - 依赖安全检查
   - 自动化测试

2. **Docker 镜像构建**:
   - 当发布新版本（标签）时，自动构建并推送 Docker 镜像
   - 根据版本号标签决定是推送到 `latest` 还是 `dogfood` 标签

### CI/CD 流程图

```
代码提交 --> 代码质量检查 --> 测试 --> 构建
     \                                  \
      \--> (创建发布标签) --------------> Docker镜像构建 --> 推送镜像
```

## 贡献指南

### 开发流程

1. Fork 仓库并克隆到本地
2. 创建新分支：`git checkout -b feature/your-feature-name`
3. 开发并测试您的功能
4. 确保代码通过所有检查
5. 提交变更：`git commit -m 'feat: add some feature'`
6. 推送到您的 Fork：`git push origin feature/your-feature-name`
7. 创建 Pull Request

### 分支策略

- `main`: 主分支，包含稳定代码
- `dev`: 开发分支，包含最新功能
- `feature/*`: 功能分支，用于开发新功能
- `fix/*`: 修复分支，用于修复 bug
- `docs/*`: 文档分支，用于更新文档

### 提交消息规范

项目使用语义化提交消息：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码风格更改（格式化）
- `refactor`: 代码重构
- `test`: 添加测试
- `chore`: 构建过程或辅助工具变动

例如：
```
feat: 添加文件有效期设置功能
fix: 修复大文件上传崩溃问题
docs: 更新 API 文档
```

### Pull Request 流程

1. PR 标题应使用语义化提交消息格式
2. PR 描述应详细说明变更内容和原因
3. PR 应该包含适当的测试用例
4. PR 将经过代码评审后合并到主分支 