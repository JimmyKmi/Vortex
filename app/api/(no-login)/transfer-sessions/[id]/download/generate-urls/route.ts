import { NextRequest } from 'next/server'
import { FileService } from '@/lib/services/file-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateTransferSession } from '@/lib/utils/transfer-session'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'

const fileService = new FileService()

/**
 * 批量生成文件下载 URL 接口
 *
 * 该接口用于：
 * 1. 为多个文件生成预签名下载 URL
 * 2. 支持批量处理，建议每批不超过10个文件
 *
 * @route POST /api/transfer-sessions/[id]/download/generate-urls
 * @params
 *   - id: string - 传输会话 ID
 *
 * @body
 *   - files: Array<{
 *       fileId: string - 文件ID
 *       name: string - 文件名称
 *     }>
 *
 * @returns
 *   成功:
 *   - code: "Success"
 *   - data: Array<{
 *       url: string - 下载URL
 *       filename: string - 文件名
 *     }>
 *
 *   失败:
 *   - code: "InvalidParams" | "GetDownloadUrlFailed" | TransferSessionValidationError
 *   - message?: string - 错误信息
 */

// 请求体验证模式
const requestSchema = z.object({
  files: z.array(
    z.object({
      fileId: z.string(),
      name: z.string() // 保留name用于返回文件名
    })
  )
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const validatedData = requestSchema.parse(body)
    const { id: sessionId } = await Promise.resolve(params)

    if (!sessionId) return ResponseThrow('InvalidSession')

    // 获取会话信息
    const session = await prisma.transferSession.findUnique({
      where: { id: sessionId },
      include: {
        transferCode: {
          include: {
            user: true
          }
        }
      }
    })

    // 验证会话
    const validationResult = await validateTransferSession(
      request,
      sessionId,
      ['DOWNLOADING', 'COMPLETED'],
      ['DOWNLOAD'],
      session
    )
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? 'InvalidSession')

    // 批量获取下载URL
    const downloadUrls = await Promise.all(
      validatedData.files.map(async file => {
        const downloadData = await fileService.getDownloadUrl(file.fileId, session!.transferCodeId)
        return {
          url: downloadData.url,
          filename: file.name
        }
      })
    )

    return ResponseSuccess(downloadUrls)
  } catch (error: any) {
    // 记录详细的错误信息
    console.error('Get download URLs error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      cause: error?.cause,
      validationError: error instanceof z.ZodError ? error.errors : undefined,
      requestBody: await request.json().catch(() => null)
    })

    // 如果是验证错误，返回 400
    if (error instanceof z.ZodError) return ResponseThrow('ValidationError')

    // 如果是其他错误，返回 500
    return ResponseThrow('GetDownloadUrlFailed')
  }
}
