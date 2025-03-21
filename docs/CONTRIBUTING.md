# VORTËX 贡献指南

[English](CONTRIBUTING_en.md) | 简体中文

> 📝 该文档由 LLM 生成，如有纰漏请提 [Issue](https://github.com/JimmyKmi/vortex/issues)

感谢您考虑为 VORTËX 项目做出贡献！本文档提供了参与项目开发的详细指南。

## 行为准则

- 尊重所有项目参与者
- 接受建设性批评和意见
- 专注于对项目有益的讨论和贡献
- 在交流中保持专业态度

## 问题反馈

我们使用 GitHub Issues 跟踪问题和功能请求。在创建新 issue 前，请：

1. 检查是否已存在相似的 issue
2. 使用清晰的标题和详细描述
3. 如果是 bug 报告，请提供：
   - 预期行为与实际行为的对比
   - 重现步骤
   - 环境信息（操作系统、浏览器等）
   - 错误日志或截图

## 开发准备

### 前置要求

- Node.js 20+
- npm 9+
- Git

### 设置开发环境

1. **Fork 仓库**
2. **克隆到本地**：
   ```bash
   git clone https://github.com/YOUR-USERNAME/vortex.git
   cd vortex
   ```

3. **添加上游仓库**：
   ```bash
   git remote add upstream https://github.com/JimmyKmi/vortex.git
   ```

4. **安装依赖**：
   ```bash
   npm install --legacy-peer-deps
   ```
   
   > **注意**：使用 `--legacy-peer-deps` 是必要的，因为项目使用了一些测试版的包依赖。

5. **配置环境变量**：
   ```bash
   cp .env.example .env.local
   ```

6. **启动开发服务器**：
   ```bash
   npm run dev
   ```

## 开发工作流

### 分支管理

1. **保持本地 main 分支与上游同步**：
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **创建功能分支**：
   ```bash
   git checkout -b feature/your-feature-name
   ```
   
   分支命名规范：
   - `feature/*`：新功能
   - `fix/*`：bug 修复
   - `docs/*`：文档更新
   - `refactor/*`：代码重构
   - `test/*`：测试相关

3. **定期同步上游更改**：
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### 编码规范

- 遵循项目现有的代码风格和架构
- 使用有意义的变量名和函数名
- 添加必要的注释，但避免过度注释
- 保持代码简洁和模块化

### 测试

所有新功能和 bug 修复都应包含适当的测试：

```bash
# 运行测试
npm run check-jest

# 检查测试覆盖率
npm run check-jest -- --coverage
```

### 代码质量检查

提交前请确保代码通过所有检查：

```bash
# 检查代码风格
npm run check-lint

# 检查代码格式
npm run check-prettier

# 检查依赖安全性
npm run check-security
```

## 提交流程

### 提交消息格式

项目使用[约定式提交](https://www.conventionalcommits.org/)规范，格式如下：

```
<类型>[可选作用域]: <描述>

[可选正文]

[可选脚注]
```

**类型**：
- `feat`：新功能
- `fix`：bug 修复
- `docs`：文档变更
- `style`：不影响代码功能的格式变更
- `refactor`：既不修复 bug 也不添加新功能的代码变更
- `perf`：性能优化
- `test`：添加或修改测试
- `chore`：其他不修改源代码或测试的变更

**示例**：
```
feat(auth): 添加OAuth2登录支持

添加了通过Zitadel进行OAuth2身份验证的功能。
用户现在可以使用SSO登录系统。

Closes #123
```

### 提交前检查

在提交前，请运行：
```bash
npm run format
npm run check-lint
npm run check-jest
```

## Pull Request 流程

1. **确保本地代码已更新**：
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **推送到 Fork 仓库**：
   ```bash
   git push origin feature/your-feature-name
   ```

3. **创建 Pull Request**：
   - 前往 GitHub 上的仓库
   - 点击 "Compare & pull request"
   - 填写详细的 PR 描述
   - 点击 "Create pull request"

4. **应对评审意见**：
   - 耐心等待和回应评审意见
   - 根据反馈进行必要的修改
   - 推送更新后的代码到相同分支

5. **合并后清理**：
   ```bash
   git checkout main
   git pull upstream main
   git branch -d feature/your-feature-name
   ```

## 发布流程

只有项目维护者才能执行发布操作：

1. 更新版本号（`package.json`）
2. 创建发布标签
3. 编写发布说明
4. GitHub Actions 将自动构建并发布 Docker 镜像

## 文档贡献

文档改进也是重要的贡献形式：

- 修复文档错误
- 改进现有文档
- 添加缺失的文档章节
- 翻译文档

## 额外资源

- [开发指南](DEVELOPMENT.md)
- [部署指南](DEPLOYMENT.md)
- [项目 Wiki](https://github.com/JimmyKmi/vortex/wiki)

## 联系方式

如有任何问题，请通过以下方式联系：

- GitHub Issues
- 项目讨论区

感谢您的贡献！ 