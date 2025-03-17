/**
 * 传输会话状态管理API
 * 提供传输会话状态的查询和更新功能
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTransferSession } from '@/lib/utils/transfer-session'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { TransferCodeType } from '@/types/transfer-session'

interface StatusResponse {
  id: string
  code: string
  type: string
  comment: string | null
  expires: Date | null
  createdAt: Date
  createdBy: string | null
  usedCount: number
  downloadCode: string | null
  status: string
}

/**
 * 获取传输会话状态和详细信息
 * @route GET /api/transfer-sessions/[id]/status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id: sessionId } = await Promise.resolve(params)

    // 一次性获取所有需要的数据
    const session = await prisma.transferSession.findUnique({
      where: { id: sessionId },
      include: {
        transferCode: {
          include: {
            _count: {
              select: { usages: true }
            },
            user: {
              select: { name: true }
            }
          }
        },
        linkedTransferCode: {
          select: { code: true }
        }
      }
    })

    if (!session?.transferCode) return ResponseThrow('InvalidSession')

    // 使用validateTransferSession进行验证，传入已查询的会话信息
    const validationResult = await validateTransferSession(
      req,
      sessionId,
      [],
      [session.transferCode.type as TransferCodeType],
      session
    )
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? 'InvalidSession')

    // 由于验证通过，我们知道session和相关数据一定存在
    const transferCode = session.transferCode

    // 传输码被禁用
    if (transferCode.disableReason) return ResponseThrow('TransferCodeDisabled')

    // 传输码过期
    if (transferCode.expires && transferCode.expires < new Date())
      return ResponseThrow('TransferCodeExpired')

    // 返回完整的传输会话信息
    return ResponseSuccess<StatusResponse>({
      id: transferCode.id,
      code: transferCode.code,
      type: transferCode.type,
      comment: transferCode.comment,
      expires: transferCode.expires,
      createdAt: transferCode.createdAt,
      createdBy: transferCode.user?.name || null,
      usedCount: transferCode._count.usages,
      downloadCode: session.linkedTransferCode?.code || null,
      status: session.status
    })
  } catch (error) {
    console.error('Get session status error:', error)
    return ResponseThrow('InternalServerError')
  }
}
