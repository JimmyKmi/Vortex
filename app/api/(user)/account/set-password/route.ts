import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { saltAndHashPassword } from "@/utils/password"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "Unauthorized" },
      { status: 401 }
    )
  }

  const { newPassword } = await request.json()
  
  if (!newPassword) {
    return NextResponse.json(
      { code: "MissingNewPassword" },
      { status: 400 }
    )
  }

  // 获取用户账户
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: 'credentials'
    }
  })

  const hashedPassword = saltAndHashPassword(newPassword)

  if (!account) {
    // 如果没有credentials账户，创建一个新的
    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: session.user.id,
        password: hashedPassword
      }
    })

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  }

  // 如果已有credentials账户，更新密码
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashedPassword }
  })

  return NextResponse.json(
    { success: true },
    { status: 200 }
  )
}
