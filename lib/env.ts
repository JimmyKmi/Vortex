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

// 检查 S3 配置，打印更多诊断信息
function checkS3Config() {
  if (!isServer) return; // 客户端不需要检查完整配置
  
  // 如果任何 S3 环境变量设置了，就检查是否所有必要变量都设置了
  const hasAnyS3Config = process.env.S3_ENDPOINT || process.env.S3_BUCKET_NAME ||
    (isServer && 'S3_ACCESS_KEY_ID' in process.env ? process.env.S3_ACCESS_KEY_ID : undefined)
  
  if (hasAnyS3Config && isServer) {
    const missing = []
    if (!process.env.S3_ENDPOINT) missing.push('S3_ENDPOINT')
    if (!process.env.S3_BUCKET_NAME) missing.push('S3_BUCKET_NAME')
    if (!('S3_ACCESS_KEY_ID' in process.env) || !process.env.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID')
    if (!('S3_SECRET_ACCESS_KEY' in process.env) || !process.env.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY')
    
    if (missing.length > 0) {
      console.warn(`S3 配置不完整，缺少: ${missing.join(', ')}`)
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
    checkS3Config()
    return process.env.S3_REGION
  },
  get bucket() {
    checkS3Config()
    return process.env.S3_BUCKET_NAME
  },
  ignoreErrors: process.env.IGNORE_S3_ERRORS === 'true' || false,
  // 敏感配置只在服务器端环境提供
  get accessKeyId() {
    checkS3Config()
    return isServer && 'S3_ACCESS_KEY_ID' in process.env ? process.env.S3_ACCESS_KEY_ID : undefined
  },
  get secretAccessKey() {
    checkS3Config()
    return isServer && 'S3_SECRET_ACCESS_KEY' in process.env ? process.env.S3_SECRET_ACCESS_KEY : undefined
  },
} 