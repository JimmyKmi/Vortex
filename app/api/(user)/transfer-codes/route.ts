import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateTransferCode } from '@/lib/utils/generate-transfer-code'
import { SPEED_LIMIT_OPTIONS } from './[id]/route'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { S3StorageService } from '@/lib/s3/storage'
import { S3_CONFIG } from '@/lib/env'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/s3/client'

// 创建传输码的请求体验证
const createTransferCodeSchema = z.object({
  type: z.enum(['UPLOAD', 'COLLECTION']),
  comment: z.string().max(100, '描述最多100个字符').optional().nullable(),
  expires: z.string().datetime().nullable(),
  speedLimit: z
    .number()
    .refine((val) => val === null || SPEED_LIMIT_OPTIONS.includes(val), '无效的速度限制选项')
    .nullable()
})

// 批量操作的请求体验证
const batchActionSchema = z.object({
  ids: z.array(z.string()),
  action: z.enum(['disable', 'enable']).optional()
})

// 获取用户的传输码列表
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')

  try {
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')

    const transferCodes = await prisma.transferCode.findMany({
      where: {
        userId: session.user.id,
        ...(type ? { type } : {})
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return ResponseSuccess(transferCodes)
  } catch (error) {
    console.error('Failed to fetch transfer codes:', error)
    return ResponseThrow('DatabaseError')
  }
}

// 创建新的传输码
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')

  try {
    const json = await req.json()
    const body = createTransferCodeSchema.parse(json)
    const code = await generateTransferCode()

    const transferCode = await prisma.transferCode.create({
      data: {
        code,
        type: body.type,
        userId: session.user.id,
        comment: body.comment || null,
        expires: body.expires ? new Date(body.expires) : null,
        speedLimit: body.speedLimit || null
      }
    })

    return ResponseSuccess(transferCode)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow('InvalidParams')
    }
    console.error('Create transfer code error:', error)
    return ResponseThrow('DatabaseError')
  }
}

// 批量操作（启用/禁用）
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')

  try {
    const json = await request.json()
    const { ids, action = 'disable' } = batchActionSchema.parse(json)

    // 验证所有传输码都属于当前用户
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      }
    })

    if (transferCodes.length !== ids.length) {
      return ResponseThrow('NotFound')
    }

    // 如果是启用操作，需要检查是否有过期的传输码
    if (action === 'enable') {
      const hasExpired = transferCodes.some((code) => code.expires && new Date(code.expires) < new Date())
      if (hasExpired) {
        return ResponseThrow('TransferCodeExpired')
      }
    }

    // 批量更新
    await prisma.transferCode.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      },
      data: {
        disableReason: action === 'disable' ? 'USER' : null
      }
    })

    return ResponseSuccess()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow('InvalidParams')
    }
    console.error('Failed to batch update transfer codes:', error)
    return ResponseThrow('DatabaseError')
  }
}

// 批量删除
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')
  const s3Service = S3StorageService.getInstance()

  try {
    // 安全地解析请求体
    let json
    try {
      json = await request.json()
    } catch (_parseError) {
      return ResponseThrow('InvalidParams')
    }

    // 确保json不为null且符合预期结构
    if (!json || !Array.isArray(json.ids)) {
      return ResponseThrow('InvalidParams')
    }

    const { ids } = batchActionSchema.parse(json)

    // 验证所有传输码都属于当前用户
    const transferCodes = await prisma.transferCode.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      }
    })

    if (transferCodes.length !== ids.length) {
      return ResponseThrow('NotFound')
    }

    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // 跟踪S3删除错误
      let s3DeleteError = null

      for (const transferCodeId of ids) {
        try {
          // 1. 查找与传输码关联的所有文件
          const fileRelations = await tx.fileToTransferCode.findMany({
            where: { transferCodeId },
            include: { file: true }
          })

          // 2. 删除 S3 中的文件
          const filesToDelete = fileRelations
            .filter((relation) => !relation.file.isDirectory)
            .map((relation) => ({
              s3BasePath: relation.file.s3BasePath,
              relativePath: relation.file.relativePath
            }))

          try {
            if (filesToDelete.length > 0) {
              await s3Service.deleteFiles(filesToDelete)
            }

            // 2.1 尝试删除压缩包（如果存在）
            try {
              // 使用S3StorageService的方法获取正确的压缩包S3键
              const compressKey = s3Service.getCompressS3Key(transferCodeId)
              // 不需要检查压缩包是否存在，直接尝试删除
              const command = new DeleteObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: compressKey
              })
              await s3Client.send(command)
              console.log(`已删除传输码 ${transferCodeId} 的压缩包`)
            } catch (compressError) {
              // 压缩包可能不存在，忽略该错误
              console.log(
                `传输码 ${transferCodeId} 的压缩包删除失败或不存在:`,
                compressError instanceof Error ? compressError.message : 'Unknown error'
              )
            }
          } catch (s3Error) {
            const errorMsg = s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'
            console.error('Failed to delete S3 files:', errorMsg)
            // 记录错误但继续处理数据库清理
            s3DeleteError = s3Error
          }

          // 3. 先删除关联记录，避免外键约束问题
          if (fileRelations.length > 0) {
            // 获取需要删除的文件ID列表
            const fileIds = fileRelations.map((relation) => relation.file.id)

            // 删除文件与传输码的关联
            const deletedRelations = await tx.fileToTransferCode.deleteMany({
              where: {
                transferCodeId
              }
            })
            console.log(`已删除 ${deletedRelations.count} 个文件关联记录`)

            // 检查这些文件是否还被其他传输码使用
            const stillInUseFiles = await tx.fileToTransferCode.findMany({
              where: {
                fileId: { in: fileIds }
              },
              select: {
                fileId: true
              }
            })

            // 如果某些文件仍在使用，则从删除列表中移除
            const stillInUseFileIds = stillInUseFiles.map((f) => f.fileId)
            console.log(`仍在使用的文件IDs: ${stillInUseFileIds.join(', ')}`)

            // 只删除不再被其他传输码使用的文件
            const fileIdsToDelete = fileIds.filter((id) => !stillInUseFileIds.includes(id))
            console.log(`最终需要删除的文件IDs: ${fileIdsToDelete.join(', ')}`)

            if (fileIdsToDelete.length > 0) {
              const deletedFiles = await tx.file.deleteMany({
                where: {
                  id: {
                    in: fileIdsToDelete
                  }
                }
              })
              console.log(`已删除 ${deletedFiles.count} 个文件记录`)
            }
          }

          // 5. 删除传输码的其他关联数据
          await tx.transferCodeUsage.deleteMany({
            where: { transferCodeId }
          })

          await tx.transferSession.deleteMany({
            where: { transferCodeId }
          })

          await tx.uploadToken.deleteMany({
            where: { transferCodeId }
          })
        } catch (innerError) {
          console.error(
            `Error processing transfer code ${transferCodeId}:`,
            innerError instanceof Error ? innerError.message : 'Unknown inner error'
          )
          // 继续处理下一个传输码
        }
      }

      // 6. 最后批量删除传输码
      await tx.transferCode.deleteMany({
        where: {
          id: { in: ids },
          userId: session.user.id
        }
      })

      // 记录S3删除错误但不抛出异常
      if (s3DeleteError) {
        console.warn('S3 files deletion had errors but database records were deleted successfully')
      }
    })

    return ResponseSuccess()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow('InvalidParams')
    }

    // 安全地记录错误
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to batch delete transfer codes: ${errorMessage}`)
    } catch (_loggingError) {
      console.error('Error while logging')
    }
    return ResponseThrow('DatabaseError')
  }
}
