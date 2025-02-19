import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const batchActionSchema = z.object({
  ids: z.array(z.string()),
  action: z.enum(["disable", "enable"]).optional(),
})

// 批量禁用/启用
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const { ids, action = "disable" } = batchActionSchema.parse(json)

    // 验证所有传输码都属于当前用户
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        id: {
          in: ids,
        },
        userId: session.user.id,
      },
    })

    if (transferCodes.length !== ids.length) {
      return NextResponse.json({ code: "NotFound" }, { status: 404 })
    }

    // 如果是启用操作，需要检查是否有过期的传输码
    if (action === "enable") {
      const hasExpired = transferCodes.some(
        (code: { expires: Date | null }) => code.expires && new Date(code.expires) < new Date()
      )
      if (hasExpired) {
        return NextResponse.json({ code: "TransferCodeExpired" }, { status: 400 })
      }
    }

    // 批量更新
    await prisma.transferCode.updateMany({
      where: {
        id: {
          in: ids,
        },
        userId: session.user.id,
      },
      data: {
        disableReason: action === "disable" ? "USER" : null,
      },
    })

    return NextResponse.json({ code: "Success" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ code: "ValidationError", errors: error.errors }, { status: 400 })
    }
    console.error("Failed to batch update transfer codes:", error)
    return NextResponse.json({ code: "DatabaseError" }, { status: 500 })
  }
}

// 批量删除
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const { ids } = batchActionSchema.parse(json)

    // 验证所有传输码都属于当前用户
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        id: {
          in: ids,
        },
        userId: session.user.id,
      },
    })

    if (transferCodes.length !== ids.length) {
      return NextResponse.json({ code: "NotFound" }, { status: 404 })
    }

    // 批量删除
    await prisma.transferCode.deleteMany({
      where: {
        id: {
          in: ids,
        },
        userId: session.user.id,
      },
    })

    return NextResponse.json({ code: "Success" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ code: "ValidationError", errors: error.errors }, { status: 400 })
    }
    console.error("Failed to batch delete transfer codes:", error)
    return NextResponse.json({ code: "DatabaseError" }, { status: 500 })
  }
} 