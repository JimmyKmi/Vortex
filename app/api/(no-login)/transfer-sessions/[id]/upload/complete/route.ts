import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTransferSession } from '@/lib/utils/transfer-session'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: sessionId } = await Promise.resolve(params)

    // 验证会话
    const validationResult = await validateTransferSession(
      req,
      sessionId,
      ['UPLOADING'],
      ['UPLOAD']
    )
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? 'InvalidSession')

    // 更新会话状态为 CONFIGURING
    await prisma.transferSession.update({
      where: { id: sessionId },
      data: {
        status: 'CONFIGURING'
      }
    })

    // 确保下载码存在并返回
    const session = await prisma.transferSession.findUnique({
      where: { id: sessionId },
      include: {
        linkedTransferCode: true
      }
    })
    if (!session || !session.linkedTransferCode) return ResponseThrow('InternalServerError')

    return ResponseSuccess({ downloadCode: session.linkedTransferCode.code })
  } catch (error) {
    console.error('Complete upload error:', error)
    return ResponseThrow('InternalServerError')
  }
}
