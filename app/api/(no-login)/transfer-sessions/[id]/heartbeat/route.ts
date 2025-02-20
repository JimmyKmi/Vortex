/**
 * 传输会话心跳管理API
 * 用于维持传输会话的活跃状态，定期更新会话的活动时间
 */

import {NextRequest} from "next/server"
import {prisma} from "@/lib/prisma"
import {validateTransferSession, setSessionCookie, getSessionCookie} from "@/lib/utils/transfer-session"
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"
import {TransferSession} from "@/types/transfer-session"

/**
 * 创建心跳响应并更新会话cookie
 */
async function createHeartbeatResponse(
  session: TransferSession,
  req: NextRequest
): Promise<Response> {
  const response = ResponseSuccess()
  const sessionCookie = await getSessionCookie(session.transferCodeId, req)
  if (sessionCookie) {
    await setSessionCookie(
      session.transferCodeId,
      {
        ...sessionCookie
      },
      response
    )
  }
  return response
}

/**
 * 更新传输会话心跳
 * @route POST /api/transfer-sessions/[id]/heartbeat
 */
export async function POST(
  req: NextRequest,
  {params}: { params: { id: string } }
): Promise<Response> {
  try {
    const {id: sessionId} = await Promise.resolve(params)

    // 验证会话
    const validationResult = await validateTransferSession(req, sessionId, [], [])
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? "InvalidSession")

    const session = validationResult.session!

    // 检查会话是否需要更新活动时间
    if (session.updatedAt <= new Date(Date.now() - 60 * 1000)) await prisma.transferSession.update({
      where: {id: sessionId},
      data: {}
    })

    return createHeartbeatResponse(session, req)
  } catch (error) {
    console.error("Session heartbeat error:", error)
    return ResponseThrow("InternalServerError")
  }
} 