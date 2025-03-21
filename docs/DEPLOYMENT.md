# VORTËX 部署指南

[English](DEPLOYMENT_en.md) | 简体中文

> 📝 该文档由 LLM 生成，如有纰漏请提 [Issue](https://github.com/JimmyKmi/vortex/issues)

本文档提供 VORTËX 文件传输系统的详细部署说明，包括 Docker 容器化部署和环境配置。

## Docker 部署（推荐）

### 前置条件

- Docker 19.03+
- Docker Compose v2+
- 至少 1GB 可用内存
- 至少 10GB 可用磁盘空间（取决于预期存储的文件大小）

### 基础部署步骤

1. **创建部署目录**：

   ```bash
   mkdir vortex && cd vortex
   ```

2. **创建 docker-compose.yml 文件**：

   ```yaml
   version: '3.8'

   services:
     vortex:
       image: jimmykmi/vortex:latest
       env_file: ./.env
       container_name: vortex
       ports:
         - '21330:3000'
       volumes:
         - ./data:/app/data
       restart: unless-stopped
   ```

3. **准备环境配置文件**：

   ```bash
   curl -o .env https://raw.githubusercontent.com/JimmyKmi/vortex/main/.env.example
   # 编辑 .env 文件配置必要参数
   ```

4. **启动服务**：

   ```bash
   docker-compose up -d
   ```

5. **验证部署**：
   - 访问 `http://YOUR_SERVER_IP:21330`
   - 确认日志无异常：`docker-compose logs -f`

### Docker 标签说明

VORTËX 提供以下 Docker 镜像标签：

- `latest`: 最新的稳定版本，推荐生产环境使用
- `dogfood`: 最新的测试版本，包含实验性功能
- `x.y.z`: 特定版本号，用于固定版本部署

### 数据持久化

VORTËX 默认将数据存储在容器内的 `/app/data` 目录。为了确保数据持久化，该目录已通过 volume 映射到宿主机的 `./data` 目录。此数据目录包含：

- SQLite 数据库文件
- 上传的文件（如不使用外部存储如 S3）
- 系统日志

建议定期备份该目录。

## 环境变量配置

### 基础配置

| 变量名            | 描述     | 默认值 | 是否必需 |
| ----------------- | -------- | ------ | -------- |
| `APP_NAME`        | 应用名称 | VORTËX | 否       |
| `APP_FOOTER`      | 页脚文本 | -      | 否       |
| `APP_FOOTER_LINK` | 页脚链接 | -      | 否       |

### 认证配置

| 变量名                   | 描述             | 默认值 | 是否必需 |
| ------------------------ | ---------------- | ------ | -------- |
| `AUTH_SECRET`            | 认证加密密钥     | -      | 是       |
| `AUTH_TRUST_HOST`        | 是否信任代理头   | false  | 否       |
| `AUTH_ZITADEL_CLIENT_ID` | Zitadel客户端ID  | -      | 否       |
| `AUTH_ZITADEL_ISSUER`    | Zitadel发行者URL | -      | 否       |

### 存储配置

| 变量名                 | 描述         | 默认值 | 是否必需     |
| ---------------------- | ------------ | ------ | ------------ |
| `S3_REGION`            | S3区域       | -      | 使用S3时必需 |
| `S3_BUCKET_NAME`       | S3存储桶名称 | -      | 使用S3时必需 |
| `S3_ACCESS_KEY_ID`     | S3访问密钥ID | -      | 使用S3时必需 |
| `S3_SECRET_ACCESS_KEY` | S3访问密钥   | -      | 使用S3时必需 |
| `S3_ENDPOINT`          | S3端点URL    | -      | 使用S3时必需 |
| `S3_BASE_PATH`         | S3基础路径   | -      | 否           |

## 反向代理配置

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name vortex.yourdomain.com;

    # 将HTTP请求重定向到HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name vortex.yourdomain.com;

    # SSL配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 优化SSL设置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;

    # 代理设置
    location / {
        proxy_pass http://localhost:21330;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 上传文件大小限制
        client_max_body_size 5000M;
    }
}
```
