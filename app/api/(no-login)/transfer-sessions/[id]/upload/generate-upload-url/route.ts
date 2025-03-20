import { NextRequest } from 'next/server'
import { FileService } from '@/lib/services/file-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateTransferSession } from '@/lib/utils/transfer-session'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import logger from '@/lib/utils/logger'

const fileService = new FileService()

/**
 * 生成文件上传 URL 接口
 *
 * 该接口用于：
 * 1. 为文件上传操作生成预签名 URL
 * 2. 创建文件/文件夹记录
 *
 * @route POST /api/transfer-sessions/[id]/upload/generate-upload-url
 * @params
 *   - id: string - 传输会话 ID（路径参数）
 *
 * @body
 *   - name: string - 文件/文件夹名称
 *   - mimeType?: string - 文件 MIME 类型
 *   - size?: number - 文件大小(字节)
 *   - relativePath?: string - 相对路径
 *   - isDirectory?: boolean - 是否为目录
 *
 * @returns
 *   成功:
 *   - code: "Success"
 *   - data:
 *     - 文件夹: FolderRecord
 *     - 文件: { url: string, fileId: string }
 *
 *   失败:
 *   - code: "InvalidParams" | "GetUploadUrlFailed" | TransferSessionValidationError
 *   - message?: string - 错误信息
 */

// 请求体验证模式
const requestSchema = z.object({
  name: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  relativePath: z.string().optional(),
  isDirectory: z.boolean().optional()
})

// 创建文件记录
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
    const validationResult = await validateTransferSession(request, sessionId, ['UPLOADING'], ['UPLOAD'], session)
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? 'InvalidSession')

    if (validatedData.isDirectory) {
      const folder = await fileService.createFolderRecord({
        ...validatedData,
        transferCodeId: session!.transferCodeId,
        userId: session!.transferCode.user.id,
        sessionId: sessionId
      })
      return ResponseSuccess(folder)
    }

    // 获取上传 URL
    const uploadData = await fileService.getUploadUrl({
      ...validatedData,
      transferCodeId: session!.transferCodeId,
      userId: session!.transferCode.user.id,
      sessionId: sessionId
    })
    return ResponseSuccess(uploadData)
  } catch (error: any) {
    // 记录详细的错误信息
    logger.error('Get upload URL error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      cause: error?.cause,
      validationError: error instanceof z.ZodError ? error.errors : undefined,
      requestBody: await request.json().catch(() => null)
    })

    // 如果是验证错误，返回 400
    if (error instanceof z.ZodError) return ResponseThrow('ValidationError')

    // 如果是其他错误，返回 500
    return ResponseThrow('GetUploadUrlFailed')
  }
}
