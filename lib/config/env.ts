import { z } from "zod"

// 使用 zod 校验环境变量
const envSchema = z.object({
  // 应用名称
  NEXT_PUBLIC_APP_NAME: z.string().optional(),

  // 页脚文字
  NEXT_PUBLIC_FOOTER: z.string().optional(),

  // 页脚链接
  NEXT_PUBLIC_FOOTER_LINK: z.string().optional(),

  // S3存储配置
  S3_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional().transform(val => val === 'true'),
})

// 校验环境变量
const env = envSchema.parse(process.env)

// 导出带默认值的环境变量
export const NEXT_PUBLIC_APP_NAME = env.NEXT_PUBLIC_APP_NAME || 'Jimmy FILË'
export const NEXT_PUBLIC_FOOTER = env.NEXT_PUBLIC_FOOTER || 'MAKE LIFE BETTER'
export const NEXT_PUBLIC_FOOTER_LINK = env.NEXT_PUBLIC_FOOTER_LINK || 'JimmyKmi\'s GitHub|https://github.com/JimmyKmi/jimmy-file'

// 检查 S3 配置是否完整
const checkS3Config = () => {
  if (process.env.NODE_ENV === 'development') {
    return // 开发环境下不强制要求 S3 配置
  }
  const requiredKeys = ['S3_REGION', 'S3_BUCKET_NAME', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']
  const missingKeys = requiredKeys.filter(key => !env[key as keyof typeof env])
  if (missingKeys.length > 0) {
    throw new Error(`Missing required S3 configuration: ${missingKeys.join(', ')}`)
  }
}

// 导出 S3 配置
export const S3_CONFIG = {
  get region() {
    checkS3Config()
    return env.S3_REGION || 'dev-region'
  },
  get bucket() {
    checkS3Config()
    return env.S3_BUCKET_NAME || 'dev-bucket'
  },
  get accessKeyId() {
    checkS3Config()
    return env.S3_ACCESS_KEY_ID || 'dev-key'
  },
  get secretAccessKey() {
    checkS3Config()
    return env.S3_SECRET_ACCESS_KEY || 'dev-secret'
  },
  get endpoint() {
    return env.S3_ENDPOINT
  },
  get forcePathStyle() {
    return env.S3_FORCE_PATH_STYLE
  },
}