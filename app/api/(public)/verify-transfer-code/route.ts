import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { setSessionCookie } from '@/lib/utils/transfer-session'
import { v4 as uuidv4 } from 'uuid'

// 获取客户端真实IP
function getClientIp(req: NextRequest): string | null {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || null
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await auth()
    const body = await req.json()
    const { code } = body

    // 验证传输码
    const transferCode = await prisma.transferCode.findUnique({
      where: { code },
      include: {
        user: true,
        sourceTransferCode: true
      }
    })

    if (!transferCode) return NextResponse.json({ code: 'TransferCodeNotFound' })

    if (transferCode.disableReason) return NextResponse.json({ code: 'TransferCodeDisabled' })

    if (transferCode.expires && transferCode.expires < new Date())
      return NextResponse.json({ code: 'TransferCodeExpired' })

    const clientIp = getClientIp(req)
    const userAgent = req.headers.get('user-agent')
    const fingerprint = uuidv4() // 生成随机指纹

    // 创建新的会话
    const transferSession = await prisma.transferSession.create({
      data: {
        transferCodeId: transferCode.id,
        fingerprint,
        status: transferCode.type === 'UPLOAD' ? 'PICKING' : 'DOWNLOADING',
        ipAddress: clientIp,
        userAgent: userAgent,
        linkedTransferCodeId:
          transferCode.type === 'DOWNLOAD' ? transferCode.sourceTransferCodeId : null
      }
    })

    // 记录使用记录
    await prisma.transferCodeUsage.create({
      data: {
        transferCodeId: transferCode.id,
        userId: authSession?.user?.id || transferCode.userId,
        status: 'SUCCESS',
        ipAddress: clientIp,
        userAgent: userAgent || null
      }
    })

    // 等待会话初始化完成
    await new Promise(resolve => setTimeout(resolve, 500))

    // 创建响应
    const response = NextResponse.json({
      code: 'Success',
      data: {
        sessionId: transferSession.id,
        type: transferCode.type,
        redirectTo:
          transferCode.type === 'UPLOAD'
            ? `/upload/${transferSession.id}`
            : `/download/${transferSession.id}`
      }
    })

    // 设置会话Cookie
    const cookieData = {
      sessionId: transferSession.id,
      fingerprint
    }
    await setSessionCookie(transferCode.id, cookieData, response)

    return response
  } catch (error: any) {
    console.error('Verify transfer code error:', error)
    return NextResponse.json({ code: 'ServerError' })
  }
}
