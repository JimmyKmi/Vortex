import {NextResponse} from "next/server"
import {auth} from "@/auth"
import {prisma} from "@/lib/prisma"

export async function DELETE(
  request: Request,
  {params}: { params: { accountId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({
        code: "Unauthorized",
        message: "未登录或会话已过期"
      }), {
        status: 401
      })
    }

    // 检查账号是否存在且属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: params.accountId,
        userId: session.user.id
      }
    })

    if (!account) {
      return new NextResponse(JSON.stringify({
        code: "NotFound",
        message: "账号不存在或无权操作"
      }), {
        status: 404
      })
    }

    // 检查是否是用户的最后一个账号
    const accountCount = await prisma.account.count({
      where: {
        userId: session.user.id
      }
    })

    if (accountCount <= 1) {
      return new NextResponse(JSON.stringify({
        code: "LastAccount",
        message: "不能删除最后一个登录方式"
      }), {
        status: 400
      })
    }

    // 删除账号
    await prisma.account.delete({
      where: {
        id: params.accountId
      }
    })

    return NextResponse.json({
      code: "Success",
      message: "账号已删除"
    })
  } catch (error) {
    console.error("[DELETE_LINKED_ACCOUNT]", error)
    return new NextResponse(JSON.stringify({
      code: "InternalServerError",
      message: "删除账号失败"
    }), {
      status: 500
    })
  }
} 