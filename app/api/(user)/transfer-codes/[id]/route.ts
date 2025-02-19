import {NextResponse} from "next/server"
import {auth} from "@/auth"
import {prisma} from "@/lib/prisma"
import {z} from "zod"
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"

// 速度限制选项（单位：KB/s）
export const SPEED_LIMIT_OPTIONS: number[] = [
  3072,    // 3Mbps
  5120,    // 5Mbps
  10240,   // 10Mbps
  15360,   // 15Mbps
  30720,   // 30Mbps
  51200,   // 50Mbps
  102400,  // 100Mbps
]

const updateTransferCodeSchema = z.object({
  comment: z.string().max(100, "描述最多100个字符").optional().nullable(),
  expires: z.string().datetime().nullable(),
  speedLimit: z.number().refine(
    (val) => val === null || SPEED_LIMIT_OPTIONS.includes(val),
    "无效的速度限制选项"
  ).nullable(),
  usageLimit: z.number().min(1).nullable(),
})

// 验证传输码存在且属于当前用户
async function validateOwnership(id: string, userId: string) {
  const transferCode = await prisma.transferCode.findUnique({
    where: {
      id,
      userId,
    },
  })

  if (!transferCode) return null
  return transferCode
}

export async function PATCH(
  request: Request,
  {params}: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  const {id} = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) return ResponseThrow("TransferCodeNotFound")

    // 验证传输码是否已禁用或过期
    if (
      transferCode.disableReason ||
      (transferCode.expires && new Date(transferCode.expires) < new Date())
    ) return ResponseThrow("TransferCodeDisabled")

    const json = await request.json()
    const body = updateTransferCodeSchema.parse(json)

    // 开启事务
    const updated = await prisma.$transaction(async (tx) => {
      // 更新传输码配置
      const updatedCode = await tx.transferCode.update({
        where: {
          id,
          userId: session.user.id, // 再次确认所有权
        },
        data: {
          comment: body.comment,
          expires: body.expires ? new Date(body.expires) : null,
          speedLimit: body.speedLimit,
          // usageLimit: body.usageLimit,
        },
      })

      // 查找并更新相关的会话状态
      const transferSession = await tx.transferSession.findFirst({
        where: {
          transferCodeId: id,
          status: "CONFIGURING"
        }
      })

      if (transferSession) await tx.transferSession.update({
        where: {id: transferSession.id},
        data: {
          status: "COMPLETED",
          updatedAt: new Date()
        }
      })

      return updatedCode
    })

    return ResponseSuccess(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow("InvalidParams")
    }
    console.error("Failed to update transfer code:", error)
    return ResponseThrow("DatabaseError")
  }
}

// 禁用/启用传输码
export async function PUT(
  _request: Request,
  {params}: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  const {id} = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) return ResponseThrow("TransferCodeNotFound")

    // 如果已过期，不允许启用
    if (!transferCode.disableReason &&
      transferCode.expires && new Date(transferCode.expires) < new Date()) {
      return ResponseThrow("TransferCodeExpired")
    }

    const updated = await prisma.transferCode.update({
      where: {
        id,
        userId: session.user.id, // 再次确认所有权
      },
      data: {
        disableReason: transferCode.disableReason ? null : "USER",
      },
    })

    return ResponseSuccess(updated)
  } catch (error) {
    console.error("Failed to toggle transfer code:", error)
    return ResponseThrow("DatabaseError")
  }
}

// 删除传输码
export async function DELETE(
  _request: Request,
  {params}: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  const {id} = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) return ResponseThrow("TransferCodeNotFound")

    await prisma.transferCode.delete({
      where: {
        id,
        userId: session.user.id, // 再次确认所有权
      },
    })

    return ResponseSuccess()
  } catch (error) {
    console.error("Failed to delete transfer code:", error)
    return ResponseThrow("DatabaseError")
  }
}
