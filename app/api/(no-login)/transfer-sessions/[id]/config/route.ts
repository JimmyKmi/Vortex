/**
 * 传输会话配置API
 * 用于更新传输会话的配置信息，如使用次数限制、过期时间等，并完成配置
 */

import {NextRequest} from "next/server"
import {prisma} from "@/lib/prisma"
import {validateTransferSession} from "@/lib/utils/transfer-session"
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"
import {transferSessionConfigSchema} from "@/lib/zod"

/**
 * 更新传输会话配置
 * @route PATCH /api/transfer-sessions/[id]/config
 */
export async function PATCH(
  req: NextRequest,
  {params}: { params: { id: string } }
): Promise<Response> {
  try {
    const {id: sessionId} = await Promise.resolve(params)
    const body = await req.json()

    // 验证请求参数
    const result = transferSessionConfigSchema.safeParse(body)
    if (!result.success) return ResponseThrow("InvalidParams")

    console.log("Update session config:", "2")

    // 验证会话
    const validationResult = await validateTransferSession(req, sessionId, ["CONFIGURING"], ["UPLOAD"])
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? "InvalidSession")


    console.log("Update session config:", "3")
    // 获取会话信息
    const session = await prisma.transferSession.findUnique({
      where: {id: sessionId},
      include: {
        linkedTransferCode: true
      }
    })

    console.log("Update session config:", "4")
    if (!session?.linkedTransferCode) return ResponseThrow("TransferCodeNotFound")

    // 开启事务，同时更新配置和状态
    await prisma.$transaction([
      // 更新下载码配置
      prisma.transferCode.update({
        where: {id: session.linkedTransferCode.id},
        data: {
          comment: result.data.comment ?? null,
          expires: result.data.expires ? new Date(result.data.expires) : null,
          speedLimit: result.data.speedLimit ? Number(result.data.speedLimit) : null
        }
      }),
      // 更新会话状态为已完成
      prisma.transferSession.update({
        where: {id: sessionId},
        data: {
          status: "COMPLETE"
        }
      })
    ])

    return ResponseSuccess()
  } catch (error) {
    console.error("Update session config error:", error)
    return ResponseThrow("InternalServerError")
  }
} 