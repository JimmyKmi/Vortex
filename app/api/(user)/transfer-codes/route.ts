import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateTransferCode } from "@/lib/utils/generate-transfer-code"
import { Prisma } from "@prisma/client"

// 创建传输码的请求体验证
const createTransferCodeSchema = z.object({
  type: z.enum(["UPLOAD", "COLLECTION", "DOWNLOAD"]),
  comment: z.string().max(100, "描述最多100个字符").optional().nullable(),
  expires: z.string().datetime().nullable(),
  speedLimit: z.number().min(0).nullable(),
})

// 获取用户的传输码列表
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: "Unauthorized" }, { status: 401 })
  }

  try {
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      code: "Success",
      data: transferCodes,
    })
  } catch (error) {
    console.error("Failed to fetch transfer codes:", error)
    return NextResponse.json({ code: "DatabaseError" }, { status: 500 })
  }
}

// 创建新的传输码
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({
        code: "Unauthorized",
        message: "请先登录"
      }, { status: 401 })
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({
        code: "UserNotFound",
        message: "用户不存在"
      }, { status: 400 })
    }

    const body = await req.json()
    const { comment, expires, speedLimit } = body

    // 生成新的传输码
    const code = await generateTransferCode()

    // 创建传输码记录
    const transferCode = await prisma.transferCode.create({
      data: {
        code,
        type: "UPLOAD",
        userId: user.id,
        comment: comment || null,
        expires: expires ? new Date(expires) : null,
        speedLimit: speedLimit || null
      }
    })

    return NextResponse.json({
      code: "Success",
      data: transferCode
    })
  } catch (error: any) {
    console.error("Create transfer code error:", error?.message || error)
    return NextResponse.json({
      code: "InternalError",
      message: "创建传输码失败"
    }, { status: 500 })
  }
} 