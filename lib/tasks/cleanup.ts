import { prisma } from '@/lib/prisma'
import { isSessionExpired } from '@/lib/utils/transfer-session'
import { S3StorageService } from '@/lib/s3/storage'
import { taskLogger } from '@/lib/utils/logger'

/**
 * 清理过期和无用的数据
 * 包括：
 * 1. 过期的会话
 * 2. 过期的传输码
 * 3. 孤立的文件记录（没有关联的传输码）
 * @param silent 是否静默执行（不输出详细日志），默认为false
 */
export async function cleanupTask(silent: boolean = false) {
  try {
    if (!silent) taskLogger.info('Starting cleanup task')
    const now = new Date()
    const results: Record<string, number> = {}

    // 1. 清理过期会话
    const sessions = await prisma.transferSession.findMany({
      select: {
        id: true,
        updatedAt: true
      }
    })

    const expiredSessionIds = sessions
      .filter((session) => isSessionExpired(session.updatedAt))
      .map((session) => session.id)

    if (expiredSessionIds.length > 0) {
      const deletedSessions = await prisma.transferSession.deleteMany({
        where: {
          id: {
            in: expiredSessionIds
          }
        }
      })
      results.expiredSessions = deletedSessions.count
      if (!silent) taskLogger.info(`Removed ${deletedSessions.count} expired sessions`)
    }

    // 2. 清理过期的传输码
    const expiredCodes = await prisma.transferCode.updateMany({
      where: {
        expires: {
          not: null,
          lt: now
        },
        disableReason: null
      },
      data: {
        disableReason: 'LIMIT'
      }
    })

    if (expiredCodes.count) {
      results.expiredCodes = expiredCodes.count
      if (!silent) taskLogger.info(`Disabled ${expiredCodes.count} expired transfer codes`)
    }

    // 3. 清理孤立的文件记录
    // 首先找出没有关联传输码的文件
    const orphanedFiles = await prisma.file.findMany({
      where: {
        transferCodes: {
          none: {}
        }
      },
      select: {
        id: true,
        s3BasePath: true,
        relativePath: true
      }
    })

    if (orphanedFiles.length > 0) {
      // 先从S3存储中删除文件
      try {
        const s3Service = S3StorageService.getInstance()

        // 准备要删除的文件列表
        const filesToDelete = orphanedFiles
          .filter((file) => file.s3BasePath && file.relativePath !== undefined)
          .map((file) => ({
            s3BasePath: file.s3BasePath,
            relativePath: file.relativePath
          }))

        if (filesToDelete.length > 0) {
          await s3Service.deleteFiles(filesToDelete)
          results.s3Files = filesToDelete.length
          if (!silent) taskLogger.info(`Deleted ${filesToDelete.length} S3 files`)
        }
      } catch (error) {
        taskLogger.error({ err: error }, 'Failed to delete S3 files')
      }

      // 删除数据库中的孤立文件记录
      await prisma.file.deleteMany({
        where: {
          id: {
            in: orphanedFiles.map((f) => f.id)
          }
        }
      })
      results.orphanedRecords = orphanedFiles.length
      if (!silent) taskLogger.info(`Deleted ${orphanedFiles.length} orphaned file records`)
    }

    if (!silent) {
      if (Object.keys(results).length === 0) {
        taskLogger.info('Cleanup task completed - nothing to clean')
      } else {
        taskLogger.info({ results }, 'Cleanup task completed successfully')
      }
    }

    return results
  } catch (error) {
    taskLogger.error({ err: error }, 'Cleanup task failed')
    throw error
  }
}
