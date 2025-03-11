# Stage 1: 依赖安装和应用构建
FROM node:23-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NEXT_SWC=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

RUN npm config set registry https://registry.npmmirror.com
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: 生产环境运行
FROM node:23-alpine AS runner
WORKDIR /app

# 基础环境变量
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    AUTH_TRUST_HOST=true

# 用户配置变量
ENV APP_NAME=${APP_NAME}

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 从builder阶段复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 安装prisma CLI，确保迁移命令可用
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g prisma@latest

# 设置正确的权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 添加数据库迁移命令并启动应用
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]