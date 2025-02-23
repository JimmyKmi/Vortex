import {NextRequest} from "next/server"
import {prisma} from "@/lib/prisma"
import {validateTransferSession} from "@/lib/utils/transfer-session"
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"
import {FileService} from "@/lib/services/file-service"

const fileService = new FileService()

/**
 * 压缩下载接口
 * 用于:
 * 1. 检查是否有已完成的压缩包
 * 2. 如果已完成,直接返回下载链接
 * 3. 如果未完成,创建压缩任务并返回进度信息
 * 
 * @route POST /api/download/[params]/compress-download
 */
export async function POST(
  req: NextRequest,
  {params}: { params: { params: string } }
) {
  try {
    // 等待params对象解析完成
    const resolvedParams = await params
    const sessionId = resolvedParams.params

    // 验证会话
    const validationResult = await validateTransferSession(req, sessionId, ["DOWNLOADING", "COMPLETED"], ["DOWNLOAD"])
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? "InvalidSession")

    // 获取会话信息
    const session = await prisma.transferSession.findUnique({
      where: {id: sessionId},
      include: {
        transferCode: true
      }
    })

    if (!session?.transferCode) return ResponseThrow("InvalidSession")

    const transferCode = await prisma.transferCode.findUnique({
      where: {id: session.transferCodeId},
      select: {
        compressStatus: true,
        compressProgress: true
      }
    })

    if (!transferCode) return ResponseThrow("InvalidSession")

    // 检查压缩状态
    switch (transferCode.compressStatus) {
      case "COMPLETED":
        // 获取压缩包下载链接
        const downloadData = await fileService.getCompressDownloadUrl(session.transferCodeId)
        return ResponseSuccess({
          status: "COMPLETED",
          url: downloadData.url
        })

      case "PROCESSING":
        // 返回当前进度
        return ResponseSuccess({
          status: "PROCESSING",
          progress: transferCode.compressProgress
        })

      case "FAILED":
        // 重置状态并开始新的压缩任务
        await prisma.transferCode.update({
          where: {id: session.transferCodeId},
          data: {
            compressStatus: "PROCESSING",
            compressProgress: 0
          }
        })
        void compressFiles(session.transferCodeId)
        return ResponseSuccess({
          status: "PROCESSING",
          progress: 0
        })

      case "IDLE":
      default:
        // 创建新的压缩任务
        await prisma.transferCode.update({
          where: {id: session.transferCodeId},
          data: {
            compressStatus: "PROCESSING",
            compressProgress: 0
          }
        })
        void compressFiles(session.transferCodeId)
        return ResponseSuccess({
          status: "PROCESSING",
          progress: 0
        })
    }

  } catch (error) {
    console.error("Compress download error:", error)
    return ResponseThrow("InternalServerError")
  }
}

/**
 * 异步压缩文件
 */
async function compressFiles(transferCodeId: string) {
  try {
    // 获取所有文件列表
    const files = await prisma.file.findMany({
      where: {
        transferCodes: {
          some: {
            transferCodeId
          }
        },
        isDirectory: false  // 只获取文件,不包括文件夹
      }
    })

    let processedFiles = 0
    const totalFiles = files.length

    // 创建压缩包
    for (const file of files) {
      try {
        // 从S3下载文件并添加到压缩包
        await fileService.addFileToCompress(file.id, transferCodeId)
        
        // 更新进度
        processedFiles++
        const progress = Math.round((processedFiles / totalFiles) * 100)
        
        await prisma.transferCode.update({
          where: {id: transferCodeId},
          data: {
            compressProgress: progress
          }
        })
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error)
      }
    }

    // 完成压缩
    await fileService.finalizeCompress(transferCodeId)

    // 更新压缩状态
    await prisma.transferCode.update({
      where: {id: transferCodeId},
      data: {
        compressStatus: "COMPLETED",
        compressProgress: 100
      }
    })

  } catch (error) {
    console.error("Compress files error:", error)
    // 更新压缩状态为失败
    await prisma.transferCode.update({
      where: {id: transferCodeId},
      data: {
        compressStatus: "FAILED",
        compressProgress: 0
      }
    })
  }
} 