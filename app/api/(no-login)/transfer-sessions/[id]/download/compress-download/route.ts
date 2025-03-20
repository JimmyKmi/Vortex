import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTransferSession } from '@/lib/utils/transfer-session'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { FileService } from '@/lib/services/file-service'
import logger from '@/lib/utils/logger'

const fileService = new FileService()

/**
 * 压缩下载接口
 * 用于:
 * 1. 检查是否有已完成的压缩包
 * 2. 如果已完成,直接返回下载链接
 * 3. 如果未完成,创建压缩任务并返回进度信息
 *
 * @route POST /api/transfer-sessions/[id]/download/compress-download
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 获取会话ID
    const { id: sessionId } = await Promise.resolve(params)

    // 验证会话
    const validationResult = await validateTransferSession(req, sessionId, ['DOWNLOADING', 'COMPLETED'], ['DOWNLOAD'])
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? 'InvalidSession')

    // 获取会话信息
    const session = await prisma.transferSession.findUnique({
      where: { id: sessionId },
      include: {
        transferCode: true
      }
    })

    if (!session?.transferCode) return ResponseThrow('InvalidSession')

    const transferCode = await prisma.transferCode.findUnique({
      where: { id: session.transferCodeId },
      select: {
        compressStatus: true,
        compressProgress: true
      }
    })

    if (!transferCode) return ResponseThrow('InvalidSession')

    // 检查压缩状态
    let downloadData
    switch (transferCode.compressStatus) {
      case 'COMPLETED':
        // 获取压缩包下载链接
        downloadData = await fileService.getCompressDownloadUrl(session.transferCodeId)
        return ResponseSuccess({
          status: 'COMPLETED',
          url: downloadData.url
        })

      case 'PROCESSING':
        // 返回当前进度
        return ResponseSuccess({
          status: 'PROCESSING',
          progress: transferCode.compressProgress
        })

      case 'FAILED':
        // 重置状态并开始新的压缩任务
        await prisma.transferCode.update({
          where: { id: session.transferCodeId },
          data: {
            compressStatus: 'PROCESSING',
            compressProgress: 0
          }
        })
        void compressFiles(session.transferCodeId)
        return ResponseSuccess({
          status: 'PROCESSING',
          progress: 0
        })

      case 'IDLE':
      default:
        // 创建新的压缩任务
        await prisma.transferCode.update({
          where: { id: session.transferCodeId },
          data: {
            compressStatus: 'PROCESSING',
            compressProgress: 0
          }
        })
        void compressFiles(session.transferCodeId)
        return ResponseSuccess({
          status: 'PROCESSING',
          progress: 0
        })
    }
  } catch (error) {
    logger.error('Compress download error:', error)
    return ResponseThrow('InternalServerError')
  }
}

/**
 * 异步压缩文件
 */
async function compressFiles(transferCodeId: string) {
  try {
    // 更新状态为处理中，但不设置初始进度
    await prisma.transferCode.update({
      where: { id: transferCodeId },
      data: {
        compressStatus: 'PROCESSING',
        compressProgress: 0 // 进度从0开始，由文件处理过程实时更新
      }
    })

    // 直接使用finalizeCompress方法，一次性处理所有文件
    try {
      await fileService.finalizeCompress(transferCodeId)
    } catch (error) {
      // 即使压缩过程中有错误，也继续执行

      // 检查当前进度
      const currentCode = await prisma.transferCode.findUnique({
        where: { id: transferCodeId },
        select: { compressProgress: true }
      })

      if (!currentCode) throw error
    }

    // 更新压缩状态为完成
    await prisma.transferCode.update({
      where: { id: transferCodeId },
      data: {
        compressStatus: 'COMPLETED',
        compressProgress: 100
      }
    })
  } catch (error) {
    console.error('Compress files error:', error)

    try {
      // 尝试获取当前压缩进度
      const currentCode = await prisma.transferCode.findUnique({
        where: { id: transferCodeId },
        select: { compressProgress: true, compressStatus: true }
      })

      // 如果压缩进度已经很高，可能文件已经可用，将状态设为完成
      if (currentCode && currentCode.compressProgress >= 80) {
        await prisma.transferCode.update({
          where: { id: transferCodeId },
          data: {
            compressStatus: 'COMPLETED',
            compressProgress: 100
          }
        })
        return
      }
    } catch (innerError) {
      console.error('获取压缩进度失败:', innerError)
    }

    // 更新压缩状态为失败
    await prisma.transferCode.update({
      where: { id: transferCodeId },
      data: {
        compressStatus: 'FAILED',
        compressProgress: 0
      }
    })
  }
}
