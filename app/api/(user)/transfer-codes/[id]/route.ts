import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { S3StorageService } from '@/lib/s3/storage'
import { S3_CONFIG } from '@/lib/env'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/s3/client'
import { SPEED_LIMIT_OPTIONS } from '@/app/lib/constants/transfer'

const updateTransferCodeSchema = z.object({
  comment: z.string().max(100, '描述最多100个字符').optional().nullable(),
  expires: z.string().datetime().nullable(),
  speedLimit: z
    .number()
    .refine((val) => val === null || SPEED_LIMIT_OPTIONS.includes(val), '无效的速度限制选项')
    .nullable(),
  usageLimit: z.number().min(1).nullable()
})

// 验证传输码存在且属于当前用户
async function validateOwnership(id: string, userId: string) {
  const transferCode = await prisma.transferCode.findUnique({
    where: {
      id,
      userId
    }
  })

  if (!transferCode) return null
  return transferCode
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')

  const { id } = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) return ResponseThrow('TransferCodeNotFound')

    // 验证传输码是否已禁用或过期
    if (transferCode.disableReason || (transferCode.expires && new Date(transferCode.expires) < new Date()))
      return ResponseThrow('TransferCodeDisabled')

    const json = await request.json()
    const body = updateTransferCodeSchema.parse(json)

    // 开启事务
    const updated = await prisma.$transaction(async (tx) => {
      // 更新传输码配置
      const updatedCode = await tx.transferCode.update({
        where: {
          id,
          userId: session.user.id // 再次确认所有权
        },
        data: {
          comment: body.comment,
          expires: body.expires ? new Date(body.expires) : null,
          speedLimit: body.speedLimit
          // usageLimit: body.usageLimit,
        }
      })

      // 查找并更新相关的会话状态
      const transferSession = await tx.transferSession.findFirst({
        where: {
          transferCodeId: id,
          status: 'CONFIGURING'
        }
      })

      if (transferSession)
        await tx.transferSession.update({
          where: { id: transferSession.id },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date()
          }
        })

      return updatedCode
    })

    return ResponseSuccess(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseThrow('InvalidParams')
    }
    console.error('Failed to update transfer code:', error)
    return ResponseThrow('DatabaseError')
  }
}

// 禁用/启用传输码
export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')

  const { id } = await Promise.resolve(params)

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) return ResponseThrow('TransferCodeNotFound')

    // 如果已过期，不允许启用
    if (!transferCode.disableReason && transferCode.expires && new Date(transferCode.expires) < new Date()) {
      return ResponseThrow('TransferCodeExpired')
    }

    const updated = await prisma.transferCode.update({
      where: {
        id,
        userId: session.user.id // 再次确认所有权
      },
      data: {
        disableReason: transferCode.disableReason ? null : 'USER'
      }
    })

    return ResponseSuccess(updated)
  } catch (error) {
    console.error('Failed to toggle transfer code:', error)
    return ResponseThrow('DatabaseError')
  }
}

// 删除传输码
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return ResponseThrow('Unauthorized')

  const { id } = await Promise.resolve(params)
  const s3Service = S3StorageService.getInstance()

  try {
    const transferCode = await validateOwnership(id, session.user.id)
    if (!transferCode) return ResponseThrow('TransferCodeNotFound')

    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // S3删除错误追踪
      let s3DeleteError = null

      // 1. 查找与传输码关联的所有文件
      const fileRelations = await tx.fileToTransferCode.findMany({
        where: { transferCodeId: id },
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
          // 不需要检查压缩包是否存在，直接尝试删除
          const command = new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: `compress/${id}/archive.zip`
          })
          await s3Client.send(command)
        } catch (compressError) {
          // 压缩包可能不存在，忽略该错误
          console.warn(
            `Error while delete compress file for transfer code ${id}:`,
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
        await tx.fileToTransferCode.deleteMany({
          where: {
            transferCodeId: id
          }
        })

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

        // 只删除不再被其他传输码使用的文件
        const fileIdsToDelete = fileIds.filter((id) => !stillInUseFileIds.includes(id))

        if (fileIdsToDelete.length > 0) {
          await tx.file.deleteMany({
            where: {
              id: {
                in: fileIdsToDelete
              }
            }
          })
        }
      }

      // 5. 删除传输码的其他关联数据
      await tx.transferCodeUsage.deleteMany({
        where: { transferCodeId: id }
      })

      await tx.transferSession.deleteMany({
        where: { transferCodeId: id }
      })

      await tx.uploadToken.deleteMany({
        where: { transferCodeId: id }
      })

      // 6. 最后删除传输码
      await tx.transferCode.delete({
        where: {
          id,
          userId: session.user.id // 再次确认所有权
        }
      })

      // 记录S3删除错误但不抛出异常
      if (s3DeleteError) {
        console.warn('S3 files deletion had errors but database records were deleted successfully')
      }
    })

    return ResponseSuccess()
  } catch (error) {
    // 安全地记录错误
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to delete transfer code: ${errorMessage}`)
    } catch {
      console.error('Error while logging')
    }
    return ResponseThrow('DatabaseError')
  }
}
