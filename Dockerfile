# Stage 1: 依赖安装和应用构建
FROM node:20-alpine AS builder
WORKDIR /app

# 安装构建所需的系统依赖
RUN apk add --no-cache libc6-compat

# 设置环境变量
ENV DATABASE_URL="file:./data/data.db"

# 安装依赖
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 拷贝源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: 生产环境运行
FROM node:20-alpine AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 添加运行时所需的系统依赖
RUN apk add --no-cache libc6-compat

# 创建非root用户以提高安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./package.json

# 复制构建输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制Prisma相关文件
COPY --from=builder /app/schema.prisma ./schema.prisma

# 创建数据目录并设置权限
RUN mkdir -p ./data

# 安装运行时所需的最小依赖
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 运行迁移并启动应用的入口脚本
RUN echo '#!/bin/sh\nnpx prisma migrate deploy\nexec node server.js' > /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# 设置目录权限
RUN chown -R nextjs:nodejs /app

# 使用非root用户运行
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动命令
ENTRYPOINT ["/app/docker-entrypoint.sh"] 