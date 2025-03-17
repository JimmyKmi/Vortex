import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// 获取用户列表
export const GET = auth(async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        enabled: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
})

// 更新用户角色和状态
export const PUT = auth(async req => {
  try {
    const { userId, role, enabled, forceRelogin } = await req.json()

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(typeof enabled === 'boolean' && { enabled }),
        ...(forceRelogin && {
          sessions: {
            deleteMany: {} // 删除用户所有会话，强制重新登录
          }
        })
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('更新用户失败:', error)
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
})
