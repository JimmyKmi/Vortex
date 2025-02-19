import { S3Client } from "@aws-sdk/client-s3"
import { S3_CONFIG } from "@/lib/config/env"

// 创建 S3 客户端实例
export const s3Client = new S3Client({
  region: S3_CONFIG.region,
  credentials: {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  },
  endpoint: S3_CONFIG.endpoint,
  forcePathStyle: S3_CONFIG.forcePathStyle,
  maxAttempts: 3, // 最大重试次数
}) 