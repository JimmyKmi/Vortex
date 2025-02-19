import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateTransferCode } from "@/lib/utils/generate-transfer-code"
import { SPEED_LIMIT_OPTIONS } from "./[id]/route"
import { ResponseSuccess, ResponseThrow } from "@/lib/utils/response"

// 创建传输码的请求体验证
const createTransferCodeSchema = z.object({
  type: z.enum(["UPLOAD", "COLLECTION"]),
  comment: z.string().max(100, "描述最多100个字符").optional().nullable(),
  expires: z.string().datetime().nullable(),
  speedLimit: z.number().refine(
    (val) => val === null || SPEED_LIMIT_OPTIONS.includes(val),
    "无效的速度限制选项"
  ).nullable(),
})

// 批量操作的请求体验证
const batchActionSchema = z.object({
  ids: z.array(z.string()),
  action: z.enum(["disable", "enable"]).optional(),
})

// 获取用户的传输码列表
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  try {
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')

    const transferCodes = await prisma.transferCode.findMany({
      where: {
        userId: session.user.id,
        ...(type ? { type } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return ResponseSuccess(transferCodes)
  } catch (error) {
    console.error("Failed to fetch transfer codes:", error)
    return ResponseThrow("DatabaseError")
  }
}

// 创建新的传输码
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  try {
    const json = await req.json()
    const body = createTransferCodeSchema.parse(json)
    const code = await generateTransferCode()

    const transferCode = await prisma.transferCode.create({
      data: {
        code,
        type: body.type,
        userId: session.user.id,
        comment: body.comment || null,
        expires: body.expires ? new Date(body.expires) : null,
        speedLimit: body.speedLimit || null
      }
    })

    return ResponseSuccess(transferCode)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow("InvalidParams")
    }
    console.error("Create transfer code error:", error)
    return ResponseThrow("DatabaseError")
  }
}

// 批量操作（启用/禁用）
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  try {
    const json = await request.json()
    const { ids, action = "disable" } = batchActionSchema.parse(json)

    // 验证所有传输码都属于当前用户
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    })

    if (transferCodes.length !== ids.length) {
      return ResponseThrow("NotFound")
    }

    // 如果是启用操作，需要检查是否有过期的传输码
    if (action === "enable") {
      const hasExpired = transferCodes.some(
        (code) => code.expires && new Date(code.expires) < new Date()
      )
      if (hasExpired) {
        return ResponseThrow("TransferCodeExpired")
      }
    }

    // 批量更新
    await prisma.transferCode.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      data: {
        disableReason: action === "disable" ? "USER" : null,
      },
    })

    return ResponseSuccess()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow("InvalidParams")
    }
    console.error("Failed to batch update transfer codes:", error)
    return ResponseThrow("DatabaseError")
  }
}

// 批量删除
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return ResponseThrow("Unauthorized")

  try {
    const json = await request.json()
    const { ids } = batchActionSchema.parse(json)

    // 验证所有传输码都属于当前用户
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    })

    if (transferCodes.length !== ids.length) {
      return ResponseThrow("NotFound")
    }

    // 批量删除
    await prisma.transferCode.deleteMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    })

    return ResponseSuccess()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow("InvalidParams")
    }
    console.error("Failed to batch delete transfer codes:", error)
    return ResponseThrow("DatabaseError")
  }
} 