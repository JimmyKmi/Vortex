/**
 * 传输会话验证 API（中间件专用）
 */

import {NextResponse, NextRequest} from "next/server"
import {prisma} from "@/lib/prisma"
import {isUploadPath, isDownloadPath, isCollectPath} from "@/lib/utils/route"
import {validateTransferSession} from "@/lib/utils/transfer-session"

interface ValidationResponse {
  valid: boolean
  reason?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  try {
    const {sessionId, pathname} = await request.json()

    if (!sessionId) return NextResponse.json({valid: false, reason: "NoSessionId"})

    const session = await prisma.transferSession.findUnique({
      where: {id: sessionId},
      include: {transferCode: true}
    })

    // 基础会话验证
    const validationResult = await validateTransferSession(request, sessionId, [], [], session)
    if (!validationResult.valid) return NextResponse.json({valid: false, reason: validationResult.code})

    const {type: transferType, disableReason, expires} = session!.transferCode

    // 验证访问路径与传输类型是否匹配（仅前端）
    if (
      (isUploadPath(pathname) && transferType !== "UPLOAD") ||
      (isCollectPath(pathname) && transferType !== "COLLECT") ||
      (isDownloadPath(pathname) && transferType !== "DOWNLOAD")
    ) return NextResponse.json({
      valid: false,
      reason: "InvalidTransferType"
    })

    // 验证传输码是否可用且未过期
    const isCodeValid = !disableReason && (!expires || expires > new Date())
    if (!isCodeValid) return NextResponse.json({valid: false, reason: "DisabledOrExpiredCode"})

    return NextResponse.json({valid: true})
  } catch (error) {
    console.error("Session validation error:", error)
    return NextResponse.json({valid: false, reason: "ServerError"})
  }
} 