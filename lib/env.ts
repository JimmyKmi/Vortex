// 检查是否在服务器端运行
const isServer = typeof window === 'undefined'

// 导出应用配置（带默认值）
export const NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'VORTËX'
export const NEXT_PUBLIC_FOOTER = process.env.NEXT_PUBLIC_FOOTER || 'MAKE LIFE BETTER'
export const NEXT_PUBLIC_FOOTER_LINK = process.env.NEXT_PUBLIC_FOOTER_LINK || 'JimmyKmi\'s GitHub|https://github.com/JimmyKmi/jimmy-file'

// 系统环境变量
export const NODE_ENV = process.env.NODE_ENV

// 认证相关配置
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL
export const ZITADEL_CLIENT_ID = process.env.ZITADEL_CLIENT_ID
export const ZITADEL_CLIENT_SECRET = process.env.ZITADEL_CLIENT_SECRET
export const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER

// S3配置验证
import { z } from 'zod'

// S3配置验证模式
const s3ConfigSchema = z.object({
  endpoint: z.string({ required_error: 'S3_ENDPOINT 未配置' }),
  region: z.string().optional(),
  bucket: z.string({ required_error: 'S3_BUCKET_NAME 未配置' }),
  accessKeyId: z.string({ required_error: 'S3_ACCESS_KEY_ID 未配置' }),
  secretAccessKey: z.string({ required_error: 'S3_SECRET_ACCESS_KEY 未配置' }),
})

// 验证S3配置
function validateS3Config() {
  if (!isServer) return // 客户端不需要验证完整配置
  
  // 如果任何S3环境变量被设置，才进行验证
  const hasAnyS3Config = process.env.S3_ENDPOINT || process.env.S3_BUCKET_NAME ||
    (isServer && 'S3_ACCESS_KEY_ID' in process.env ? process.env.S3_ACCESS_KEY_ID : undefined)
  
  if (hasAnyS3Config && isServer) {
    try {
      s3ConfigSchema.parse({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET_NAME,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingFields = error.errors.map(e => e.path.join('.'))
        console.warn(`S3 配置不完整，缺少: ${missingFields.join(', ')}`)
      } else {
        console.warn('S3 配置验证失败', error)
      }
    }
  }
}

// S3 配置
export const S3_CONFIG = {
  // 端点配置
  get endpoint() {
    return process.env.S3_ENDPOINT
  },
  get region() {
    validateS3Config()
    return process.env.S3_REGION
  },
  get bucket() {
    validateS3Config()
    return process.env.S3_BUCKET_NAME
  },
  ignoreErrors: process.env.IGNORE_S3_ERRORS === 'true' || false,
  // 敏感配置只在服务器端环境提供
  get accessKeyId() {
    validateS3Config()
    return isServer && 'S3_ACCESS_KEY_ID' in process.env ? process.env.S3_ACCESS_KEY_ID : undefined
  },
  get secretAccessKey() {
    validateS3Config()
    return isServer && 'S3_SECRET_ACCESS_KEY' in process.env ? process.env.S3_SECRET_ACCESS_KEY : undefined
  },
} 