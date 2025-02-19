import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

  if (!transferCode) {
    return null
  }

  return transferCode
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: "Unauthorized" }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) {
      return NextResponse.json({ code: "NotFound" }, { status: 404 })
    }

    // 验证传输码是否已禁用或过期
    if (transferCode.disableReason || 
      (transferCode.expires && new Date(transferCode.expires) < new Date())) {
      return NextResponse.json({ code: "TransferCodeDisabled" }, { status: 400 })
    }

    const json = await request.json()
    const body = updateTransferCodeSchema.parse(json)

    // 开启事务
    const updated = await prisma.$transaction(async (tx) => {
      // 更新传输码配置
      const updatedCode = await tx.transferCode.update({
        where: { id },
        data: {
          comment: body.comment,
          expires: body.expires ? new Date(body.expires) : null,
          speedLimit: body.speedLimit,
          // usageLimit: body.usageLimit,
        },
      })

      // 查找并更新相关的会话状态
      const session = await tx.transferSession.findFirst({
        where: {
          transferCodeId: id,
          status: "CONFIGURING"
        }
      })

      if (session) {
        await tx.transferSession.update({
          where: { id: session.id },
          data: {
            status: "COMPLETED",
            updatedAt: new Date()
          }
        })
      }

      return updatedCode
    })

    return NextResponse.json({
      code: "Success",
      data: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ code: "ValidationError", errors: error.errors }, { status: 400 })
    }
    console.error("Failed to update transfer code:", error)
    return NextResponse.json({ code: "DatabaseError" }, { status: 500 })
  }
}

// 禁用/启用传输码
export async function PUT(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: "Unauthorized" }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) {
      return NextResponse.json({ code: "NotFound" }, { status: 404 })
    }

    // 如果已过期，不允许启用
    if (!transferCode.disableReason && 
      transferCode.expires && new Date(transferCode.expires) < new Date()) {
      return NextResponse.json({ code: "TransferCodeExpired" }, { status: 400 })
    }

    const updated = await prisma.transferCode.update({
      where: {
        id,
      },
      data: {
        disableReason: transferCode.disableReason ? null : "USER",
      },
    })

    return NextResponse.json({
      code: "Success",
      data: updated,
    })
  } catch (error) {
    console.error("Failed to toggle transfer code:", error)
    return NextResponse.json({ code: "DatabaseError" }, { status: 500 })
  }
}

// 删除传输码
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: "Unauthorized" }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) {
      return NextResponse.json({ code: "NotFound" }, { status: 404 })
    }

    await prisma.transferCode.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ code: "Success" })
  } catch (error) {
    console.error("Failed to delete transfer code:", error)
    return NextResponse.json({ code: "DatabaseError" }, { status: 500 })
  }
}
