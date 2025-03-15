#!/bin/sh
set -e

# 设置数据目录权限
mkdir -p /app/data
chown -R nextjs:nodejs /app/data
chmod -R 777 /app/data

# 确保数据库文件存在并设置正确权限
DB_DIR=/app/data
touch $DB_DIR/data.db
chown nextjs:nodejs $DB_DIR/data.db
chmod 666 $DB_DIR/data.db

# 切换到应用目录
cd /app

# 执行数据库迁移
su-exec nextjs npx prisma migrate deploy

# 启动应用
su-exec nextjs node server.js 