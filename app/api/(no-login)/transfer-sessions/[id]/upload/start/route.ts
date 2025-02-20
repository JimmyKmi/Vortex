import {NextRequest} from "next/server"
import {prisma} from "@/lib/prisma"
import {validateTransferSession} from "@/lib/utils/transfer-session"
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"
import {generateTransferCode} from "@/lib/utils/generate-transfer-code"

/**
 * 开始上传接口
 * 用于：
 * 1. 更新会话状态为上传中
 * 2. 生成下载码（如果还没有）
 *
 * @route POST /api/transfer-sessions/[id]/start
 */
export async function POST(
  req: NextRequest,
  {params}: { params: { id: string } }
) {
  try {
    const {id: sessionId} = await Promise.resolve(params)

    // 使用事务确保操作的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 获取最新会话信息
      const session = await tx.transferSession.findUnique({
        where: {id: sessionId},
        include: {
          transferCode: {
            include: {
              user: true
            }
          }
        }
      })

      // 验证会话
      const validationResult = await validateTransferSession(req, sessionId, ["PICKING"], ["UPLOAD"], session)
      if (!validationResult.valid) return {error: validationResult.code ?? "InvalidSession"}

      // 如果已经有下载码，说明已经开始上传，防止重复操作
      if (session?.linkedTransferCodeId) return {error: "AlreadyStarted"}

      // 创建下载码
      const downloadCode = await tx.transferCode.create({
        data: {
          code: await generateTransferCode(),
          type: "DOWNLOAD",
          userId: session!.transferCode.user.id,
          sourceTransferCodeId: session!.transferCodeId
        }
      })

      // 更新会话状态为UPLOADING，并关联下载码
      const updatedSession = await tx.transferSession.update({
        where: {id: sessionId},
        data: {
          status: "UPLOADING",
          linkedTransferCodeId: downloadCode.id
        },
        include: {
          linkedTransferCode: true
        }
      })

      return {session: updatedSession}
    })

    if ('error' in result) return ResponseThrow(result.error ?? "InvalidSession")

    return ResponseSuccess()
  } catch (error) {
    console.error("Start upload error:", error)
    return ResponseThrow("InternalServerError")
  }
}