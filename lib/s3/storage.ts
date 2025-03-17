import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { s3Client } from './client'
import { S3_CONFIG } from '../env'

// 检查是否在服务器端运行
const isServer = typeof window === 'undefined'

export class S3StorageService {
  private static instance: S3StorageService

  private constructor() {}

  public static getInstance(): S3StorageService {
    if (!S3StorageService.instance) S3StorageService.instance = new S3StorageService()
    return S3StorageService.instance
  }

  /**
   * 生成加密的基础路径
   * @returns S3路径
   * @param linkedTransferCodeId
   */
  public async generateS3BasePath(linkedTransferCodeId: string): Promise<string> {
    // 确保只在服务器端执行
    if (!isServer) {
      console.warn('尝试在客户端生成S3路径，这应该只在服务器端执行')
      return `transfer/${linkedTransferCodeId}`
    }
    return `transfer/${linkedTransferCodeId}`
  }

  /**
   * 获取完整的S3路径
   * @param s3BasePath S3基础路径
   * @param relativePath 文件相对路径
   * @returns 完整的S3路径
   */
  getFullS3Key(s3BasePath: string, relativePath: string): string {
    const globalBasePath = S3_CONFIG.basePath.trim()
    const path = `${s3BasePath}/${relativePath}`
    return globalBasePath ? `${globalBasePath}/${path}` : path
  }

  /**
   * 获取压缩文件的完整S3路径
   * @param transferCodeId 传输码ID
   * @returns 压缩文件的完整S3路径
   */
  getCompressS3Key(transferCodeId: string): string {
    const compressPath = `compress/${transferCodeId}/archive.zip`
    const globalBasePath = S3_CONFIG.basePath.trim()
    return globalBasePath ? `${globalBasePath}/${compressPath}` : compressPath
  }

  /**
   * 创建预签名POST请求
   * @param params 请求参数
   * @param params.Key 文件在S3中的完整路径
   * @param params.Fields 额外的表单字段
   * @param params.Expires 链接过期时间（秒）
   * @returns 预签名URL和表单字段
   */
  async createPresignedPost(params: { Key: string; Fields?: Record<string, string>; Expires?: number }): Promise<{
    url: string
    fields: Record<string, string>
  }> {
    // 确保只在服务器端执行
    if (!isServer) {
      console.error('尝试在客户端创建预签名POST，这应该只在服务器端执行')
      throw new Error('此操作仅在服务器端可用')
    }

    if (!S3_CONFIG.bucket) {
      throw new Error('S3 bucket not configured')
    }

    // 这里不使用getFullS3Key，因为params.Key应该已经是完整路径
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: S3_CONFIG.bucket,
      Key: params.Key,
      Conditions: [
        ['content-length-range', 0, 1024 * 1024 * 1024], // 最大 1GB
        ['starts-with', '$Content-Type', '']
      ],
      Fields: params.Fields,
      Expires: params.Expires
    })

    return { url, fields }
  }

  /**
   * 删除单个文件
   * @param s3BasePath S3基础路径
   * @param relativePath 文件相对路径
   */
  async deleteFile(s3BasePath: string, relativePath: string): Promise<void> {
    // 确保只在服务器端执行
    if (!isServer) {
      console.error('尝试在客户端删除S3文件，这应该只在服务器端执行')
      throw new Error('此操作仅在服务器端可用')
    }

    if (!S3_CONFIG.bucket) {
      console.error('S3 bucket not configured')
      return // 不抛出错误，允许数据库清理继续进行
    }

    const s3Key = this.getFullS3Key(s3BasePath, relativePath)

    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: s3Key
      })
      await s3Client.send(command)
    } catch (error) {
      console.error(`Failed to delete file ${s3Key}:`, error instanceof Error ? error.message : 'Unknown error')
      // 不抛出错误，允许继续
    }
  }

  /**
   * 批量删除文件
   * @param files 文件路径数组，每项包含 s3BasePath 和 relativePath
   */
  async deleteFiles(files: { s3BasePath: string; relativePath: string }[]): Promise<void> {
    // 确保只在服务器端执行
    if (!isServer) {
      console.error('尝试在客户端批量删除S3文件，这应该只在服务器端执行')
      throw new Error('此操作仅在服务器端可用')
    }

    if (files.length === 0) return

    // 确保 S3 bucket 已配置
    if (!S3_CONFIG.bucket) {
      console.error('S3 bucket not configured')
      // 不抛出错误，允许继续执行数据库清理
      return
    }

    // 验证参数
    const validFiles = files.filter((file) => {
      if (!file.s3BasePath) {
        console.warn(`Invalid S3 file path: Missing or invalid s3BasePath`, file)
        return false
      }

      if (!file.relativePath) {
        console.warn(`Invalid S3 file path: Missing or invalid relativePath`, file)
        return false
      }

      return true
    })

    if (validFiles.length === 0) {
      console.warn('No valid files to delete')
      return
    }

    // 使用单个文件删除方法作为备选方案
    const useSingleDelete = validFiles.length < 5 // 少量文件时直接使用单个删除

    if (useSingleDelete) {
      // 单个文件逐个删除
      for (const file of validFiles) {
        try {
          await this.deleteFile(file.s3BasePath, file.relativePath)
        } catch (error) {
          console.error(
            `Error deleting individual file ${file.s3BasePath}/${file.relativePath}:`,
            error instanceof Error ? error.message : 'Unknown error'
          )
          // 继续处理其他文件
        }
      }
      return
    }

    // 多文件批量删除
    // AWS S3 批量删除限制为一次最多 1000 个对象
    const batchSize = 1000
    const batches = []

    // 将文件按批次分组
    for (let i = 0; i < validFiles.length; i += batchSize) {
      batches.push(validFiles.slice(i, i + batchSize))
    }

    // 逐批处理删除
    let hasError = false

    for (const batch of batches) {
      const objects = batch.map((file) => {
        const key = this.getFullS3Key(file.s3BasePath, file.relativePath)
        return { Key: key }
      })

      try {
        const command = new DeleteObjectsCommand({
          Bucket: S3_CONFIG.bucket,
          Delete: { Objects: objects }
        })

        await s3Client.send(command)
      } catch (error) {
        hasError = true
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to delete S3 batch: ${errorMsg}`)

        // 尝试使用单个删除作为备选
        for (const file of batch) {
          try {
            await this.deleteFile(file.s3BasePath, file.relativePath)
          } catch (singleError) {
            console.error(
              `Error in fallback delete for ${file.s3BasePath}/${file.relativePath}:`,
              singleError instanceof Error ? singleError.message : 'Unknown error'
            )
          }
        }
      }
    }

    // 不再抛出异常，这样不会阻止数据库清理操作
    if (hasError) {
      console.warn('Some S3 delete operations failed, but we will proceed with database cleanup')
    }
  }
}
