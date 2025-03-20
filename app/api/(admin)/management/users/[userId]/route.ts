import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import  logger  from '@/lib/utils/logger'

// 删除用户
export const DELETE = auth(async (req) => {
  if (!req.auth?.user?.role) return NextResponse.json({ status: 403 })

  try {
    const userId = req.nextUrl.pathname.split('/').pop()
    if (!userId) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 })
    }

    // 不允许删除自己
    if (userId === req.auth.user.id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 })
    }

    // 删除用户相关数据
    await prisma.$transaction([
      // 删除用户的所有会话
      prisma.session.deleteMany({
        where: { userId }
      }),
      // 删除用户的账号关联
      prisma.account.deleteMany({
        where: { userId }
      }),
      // 删除用户本身
      prisma.user.delete({
        where: { id: userId }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('删除用户失败:', error)
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
  }
})
