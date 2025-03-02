import { prisma } from "@/lib/prisma"
import { isSessionExpired } from "@/lib/utils/transfer-session"
import { S3StorageService } from "@/lib/s3/storage"

/**
 * 清理过期和无用的数据
 * 包括：
 * 1. 过期的会话
 * 2. 过期的传输码
 * 3. 孤立的文件记录（没有关联的传输码）
 */
export async function cleanupTask() {
  try {
    console.log("开始执行清理任务...")
    const now = new Date()

    // 1. 清理过期会话
    const sessions = await prisma.transferSession.findMany({
      select: {
        id: true,
        updatedAt: true
      }
    })
    
    const expiredSessionIds = sessions
      .filter(session => isSessionExpired(session.updatedAt))
      .map(session => session.id)
    
    if (expiredSessionIds.length > 0) {
      const deletedSessions = await prisma.transferSession.deleteMany({
        where: {
          id: {
            in: expiredSessionIds
          }
        }
      })
      console.log(`已清理 ${deletedSessions.count} 个过期会话`)
    } else {
      console.log("没有找到过期会话")
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
        disableReason: "LIMIT"
      }
    })
    console.log(`已禁用 ${expiredCodes.count} 个过期传输码`)

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
          .filter(file => file.s3BasePath && file.relativePath !== undefined) // 确保s3BasePath和relativePath都存在
          .map(file => ({
            s3BasePath: file.s3BasePath,
            relativePath: file.relativePath
          }))
        
        if (filesToDelete.length > 0) {
          console.log(`正在删除 ${filesToDelete.length} 个S3文件...`)
          await s3Service.deleteFiles(filesToDelete)
          console.log(`S3文件删除完成`)
        }
      } catch (error) {
        // 捕获并记录S3删除错误，但继续清理数据库记录
        console.error(`删除S3文件时出错:`, error instanceof Error ? error.message : '未知错误')
        console.log(`将继续清理数据库记录`)
      }
      
      // 删除数据库中的孤立文件记录
      await prisma.file.deleteMany({
        where: {
          id: {
            in: orphanedFiles.map(f => f.id)
          }
        }
      })
      console.log(`已清理 ${orphanedFiles.length} 个孤立文件记录`)
    }

    console.log("清理任务完成")
  } catch (error) {
    console.error("清理任务执行失败:", error)
  }
}