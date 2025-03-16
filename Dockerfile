# Stage 1: 依赖安装和应用构建
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com
RUN apk add --no-cache libc6-compat

ENV NEXT_SWC=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: 生产环境运行
FROM node:22-alpine AS runner
WORKDIR /app

# 基础环境变量
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 从builder阶段复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 创建data目录
RUN mkdir -p /app/data

# 安装全局 Prisma CLI 和必要工具
RUN npm config set registry https://registry.npmmirror.com
RUN npm install prisma@latest -g
RUN npm install @prisma/client -g
RUN apk add --no-cache su-exec sqlite

# 设置data目录作为卷
VOLUME /app/data

# 复制启动脚本
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 3000

# 使用root用户启动入口点脚本
USER root
CMD ["/app/entrypoint.sh"]