// 检查是否在服务器端运行
const isServer = typeof window === 'undefined'

// 定义默认值常量，便于统一管理
export const DEFAULT_APP_NAME = 'VORTËX'
export const DEFAULT_FOOTER = "JimmyKmi's GitHub / VORTEX"
export const DEFAULT_FOOTER_LINK = 'https://github.com/JimmyKmi/vortex'

// 应用公共设置接口
export interface AppPublicSettings {
  appName: string
  footer: string
  footerLink: string
}

// 客户端配置缓存
let configCache: AppPublicSettings | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5000 // 缓存时间，5秒

// 获取所有应用公共设置
export const getAppPublicSettings = async (): Promise<AppPublicSettings> => {
  // 服务器端直接从环境变量获取
  if (isServer)
    return {
      appName: process.env.APP_NAME || DEFAULT_APP_NAME,
      footer: process.env.APP_FOOTER || DEFAULT_FOOTER,
      footerLink: process.env.APP_FOOTER_LINK || DEFAULT_FOOTER_LINK
    }

  // 检查缓存是否有效
  const now = Date.now()
  if (configCache && now - lastFetchTime < CACHE_DURATION) return configCache

  // 客户端通过 API 获取
  try {
    const response = await fetch('/api/config')
    const data = await response.json()
    if (data.code === 'Success' && data.data) {
      // 更新缓存和时间戳
      configCache = {
        appName: data.data.appName || DEFAULT_APP_NAME,
        footer: data.data.footer || DEFAULT_FOOTER,
        footerLink: data.data.footerLink || DEFAULT_FOOTER_LINK
      }
      lastFetchTime = now
      return configCache
    }
  } catch (error) {
    console.error('获取应用配置失败', error)
  }

  // 如果请求失败但有缓存，仍返回缓存
  if (configCache) return configCache

  // 完全失败时返回默认值
  return {
    appName: DEFAULT_APP_NAME,
    footer: DEFAULT_FOOTER,
    footerLink: DEFAULT_FOOTER_LINK
  }
}

// 系统环境变量
export const NODE_ENV = process.env.NODE_ENV

// 认证相关配置
export const AUTH_SECRET = process.env.AUTH_SECRET || 'this-is-a-secret-key'
export const AUTH_ZITADEL_CLIENT_ID = process.env.AUTH_ZITADEL_CLIENT_ID || ''
export const AUTH_ZITADEL_ISSUER = process.env.AUTH_ZITADEL_ISSUER || ''
export const AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST === 'true'

// S3配置验证
import { z } from 'zod'

// S3配置验证模式
const s3ConfigSchema = z.object({
  endpoint: z.string({ required_error: 'S3_ENDPOINT 未配置' }),
  region: z.string().optional(),
  bucket: z.string({ required_error: 'S3_BUCKET_NAME 未配置' }),
  accessKeyId: z.string({ required_error: 'S3_ACCESS_KEY_ID 未配置' }),
  secretAccessKey: z.string({ required_error: 'S3_SECRET_ACCESS_KEY 未配置' }),
  basePath: z.string().optional()
})

// 验证S3配置
function validateS3Config() {
  if (!isServer) return // 客户端不需要验证完整配置

  // 如果任何S3环境变量被设置，才进行验证
  const hasAnyS3Config =
    process.env.S3_ENDPOINT ||
    process.env.S3_BUCKET_NAME ||
    (isServer && 'S3_ACCESS_KEY_ID' in process.env ? process.env.S3_ACCESS_KEY_ID : undefined)

  if (hasAnyS3Config && isServer) {
    try {
      s3ConfigSchema.parse({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET_NAME,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        basePath: process.env.S3_BASE_PATH
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingFields = error.errors.map((e) => e.path.join('.'))
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
  get basePath() {
    return process.env.S3_BASE_PATH || ''
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
  }
}
