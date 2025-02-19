import { TransferCode } from "@prisma/client"

// 传输码类型
export type TransferCodeType = "UPLOAD" | "DOWNLOAD" | "COLLECTION"

// 传输会话状态
// PICKING -     上传/采集        选择文件中
// COMPLETED -   上传/下载/采集   配置完成/下载完成/上传成功
// UPLOADING -   上传/采集        上传中/上传中
// CONFIGURING - 上传            上传完成，配置下载
export type TransferSessionStatus = "PICKING" | "UPLOADING" | "CONFIGURING" | "COMPLETED"

/**
 * 传输信息接口定义
 * 用于在前端展示传输会话的基本信息
 */
export interface TransferInfo {
  id: string                    // 传输会话ID
  code: string                  // 传输码
  type: string                  // 传输类型
  comment: string | null        // 传输说明
  expires: string | null        // 过期时间
  createdAt: string            // 创建时间
  createdBy: string | null     // 创建者
  usageLimit: number | null    // 使用次数限制
  usedCount?: number           // 已使用次数（可选）
  downloadCode: string | null   // 下载码
  status: TransferSessionStatus // 会话状态
}

export interface TransferSession {
  id: string
  transferCodeId: string
  linkedTransferCodeId?: string
  fingerprint: string
  status: TransferSessionStatus
  ipAddress?: string
  userAgent?: string
  s3BasePath?: string
  transferCode?: TransferCode
  createdAt: Date
  updatedAt: Date
}

export interface TransferSessionCookie {
  sessionId: string
  fingerprint: string
}

// 会话配置
export const TRANSFER_SESSION_CONFIG = {
  // Cookie名称前缀
  COOKIE_PREFIX: "transfer-session-",
  // Cookie配置
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
    maxAge: 24 * 60 * 60 // 1天（单位：秒）
  }
} 