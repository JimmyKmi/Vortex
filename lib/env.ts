import { z } from 'zod'

// 检查是否在服务器端运行
const isServer = typeof window === 'undefined'

// 客户端环境变量验证schema
const clientEnvSchema = z.object({
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  IGNORE_S3_ERRORS: z.enum(['true', 'false']).optional(),
})

// 服务器端环境变量验证schema（包含更多敏感配置）
const serverEnvSchema = isServer ? z.object({
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  IGNORE_S3_ERRORS: z.enum(['true', 'false']).optional(),
}) : clientEnvSchema

// 根据运行环境选择合适的schema进行验证
export const env = isServer 
  ? serverEnvSchema.parse(process.env)
  : clientEnvSchema.parse(process.env)

// 检查 S3 配置，打印更多诊断信息
function checkS3Config() {
  if (!isServer) return; // 客户端不需要检查完整配置
  
  // 如果任何 S3 环境变量设置了，就检查是否所有必要变量都设置了
  const hasAnyS3Config = env.S3_ENDPOINT || env.S3_BUCKET_NAME || 
    (isServer && 'S3_ACCESS_KEY_ID' in env ? env.S3_ACCESS_KEY_ID : undefined)
  
  if (hasAnyS3Config && isServer) {
    const missing = []
    if (!env.S3_ENDPOINT) missing.push('S3_ENDPOINT')
    if (!env.S3_BUCKET_NAME) missing.push('S3_BUCKET_NAME')
    if (!('S3_ACCESS_KEY_ID' in env) || !env.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID')
    if (!('S3_SECRET_ACCESS_KEY' in env) || !env.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY')
    
    if (missing.length > 0) {
      console.warn(`S3 配置不完整，缺少: ${missing.join(', ')}`)
    }
  }
}

// S3 配置
export const S3_CONFIG = {
  // 使用阿里云OSS默认端点，而不是加速端点
  endpoint: env.S3_ENDPOINT || 'https://oss-cn-hangzhou.aliyuncs.com',
  region: env.S3_REGION || 'oss-cn-hangzhou',
  bucket: env.S3_BUCKET_NAME,
  ignoreErrors: env.IGNORE_S3_ERRORS === 'true' || false,
  // 敏感配置只在服务器端环境提供
  get accessKeyId() {
    checkS3Config()
    return isServer && 'S3_ACCESS_KEY_ID' in env ? env.S3_ACCESS_KEY_ID : 'dev-key'
  },
  get secretAccessKey() {
    checkS3Config()
    return isServer && 'S3_SECRET_ACCESS_KEY' in env ? env.S3_SECRET_ACCESS_KEY : 'dev-secret'
  },
} 