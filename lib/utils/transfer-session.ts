import { cookies } from 'next/headers'
import {
  TransferSessionCookie,
  TRANSFER_SESSION_CONFIG,
  TransferSessionStatus,
  TransferSession,
  TransferCodeType
} from '@/types/transfer-session'
import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 从请求中获取会话Cookie
 * @param transferCodeId 传输码ID
 * @param req 请求对象（可选）
 * @returns 会话Cookie对象或null
 */
export async function getSessionCookie(
  transferCodeId: string,
  req?: NextRequest
): Promise<TransferSessionCookie | null> {
  const cookieName = `${TRANSFER_SESSION_CONFIG.COOKIE_PREFIX}${transferCodeId}`

  let cookieValue: string | undefined

  if (req) {
    // 从请求中获取Cookie
    cookieValue = req.cookies.get(cookieName)?.value
  } else {
    const cookieStore = await cookies() // 从服务器端获取Cookie
    cookieValue = cookieStore.get(cookieName)?.value
  }

  if (!cookieValue) return null

  try {
    return JSON.parse(cookieValue) as TransferSessionCookie
  } catch {
    return null
  }
}

/**
 * 设置会话Cookie
 * @param transferCodeId 传输码ID
 * @param session 会话信息
 * @param response 响应对象
 */
export async function setSessionCookie(
  transferCodeId: string,
  session: TransferSessionCookie,
  response: NextResponse
): Promise<void> {
  const cookieName = `${TRANSFER_SESSION_CONFIG.COOKIE_PREFIX}${transferCodeId}`

  response.cookies.set(cookieName, JSON.stringify(session), TRANSFER_SESSION_CONFIG.COOKIE_OPTIONS)
}

/**
 * 删除会话Cookie
 * @param transferCodeId 传输码ID
 */
export async function deleteSessionCookie(transferCodeId: string): Promise<void> {
  const cookieStore = await cookies()
  const cookieName = `${TRANSFER_SESSION_CONFIG.COOKIE_PREFIX}${transferCodeId}`
  cookieStore.delete(cookieName)
}

/**
 * 检查会话是否过期
 * @param updatedAt 最后更新时间
 * @returns 是否过期
 */
export function isSessionExpired(updatedAt: Date | string): boolean {
  const activityTime = new Date(updatedAt).getTime()
  const currentTime = Date.now()
  const expirationTime = activityTime + 10 * 60 * 1000 // 10分钟过期时间
  return currentTime > expirationTime
}

/**
 * 验证传输会话
 * @param req 请求对象
 * @param sessionId 会话ID
 * @param allowedStatus 允许的状态列表（可选，为空则允许所有状态）
 * @param allowedTypes 允许的传输类型列表（可选，为空则允许所有类型）
 * @param existingSession 已查询的会话信息（可选）
 * @returns 验证结果，包含是否有效、错误代码和会话信息
 */
export async function validateTransferSession(
  req: NextRequest,
  sessionId: string,
  allowedStatus: TransferSessionStatus[] = [],
  allowedTypes: TransferCodeType[] = [],
  existingSession?: any
): Promise<{
  valid: boolean
  code?: string
  session?: TransferSession
}> {
  try {
    // 使用已有会话信息或重新查询
    const dbSession =
      existingSession ||
      (await prisma.transferSession.findUnique({
        where: { id: sessionId },
        include: {
          transferCode: true
        }
      }))

    if (!dbSession) return { valid: false, code: 'InvalidSession' }

    // 转换为 TransferSession 类型
    const session = {
      ...dbSession,
      status: dbSession.status as TransferSessionStatus,
      transferCode: dbSession.transferCode
    } as TransferSession

    // 验证会话状态是否在允许列表中
    if (allowedStatus.length > 0 && !allowedStatus.includes(session.status))
      return {
        valid: false,
        code: 'InvalidSession'
      }

    // 验证传输类型是否在允许列表中
    if (
      allowedTypes.length > 0 &&
      session.transferCode &&
      !allowedTypes.includes(session.transferCode.type as TransferCodeType)
    )
      return {
        valid: false,
        code: 'InvalidTransferType'
      }

    // 验证会话Cookie
    const sessionCookie = await getSessionCookie(session.transferCodeId, req)
    if (
      !sessionCookie ||
      sessionCookie.sessionId !== sessionId ||
      sessionCookie.fingerprint !== session.fingerprint
    ) {
      return { valid: false, code: 'InvalidSession' }
    }

    // 检查会话是否已过期
    if (isSessionExpired(session.updatedAt)) {
      await prisma.transferSession.delete({
        where: { id: sessionId }
      })
      return { valid: false, code: 'InvalidSession' }
    }

    return { valid: true, session }
  } catch (error) {
    console.error('Validate transfer session error:', error)
    return { valid: false, code: 'ServerError' }
  }
}
