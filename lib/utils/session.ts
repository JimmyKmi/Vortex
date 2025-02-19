/**
 * 编码会话令牌
 * 将会话令牌转换为URL安全的Base64格式
 */
export function encodeSessionToken(token: string): string {
  return btoa(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * 解码会话令牌
 * 将URL安全的Base64格式转换回原始会话令牌
 */
export function decodeSessionToken(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return atob(paddedBase64)
}

/**
 * 获取错误消息
 */
export function getTransferCodeErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    InvalidTransferCode: "无效的传输码",
    TransferCodeNotFound: "传输码不存在",
    TransferCodeDisabled: "该传输码已被禁用",
    TransferCodeExpired: "该传输码已过期",
    TransferCodeUsageExceeded: "该传输码已达到使用次数上限",
    InvalidSession: "无效的会话",
    InternalServerError: "服务器错误，请稍后重试",
    DatabaseError: "数据库错误，请稍后重试",
  }
  return errorMessages[code] || "验证传输码失败，请重试"
} 