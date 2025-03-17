import { prisma } from '@/lib/prisma'
import { S3StorageService } from '@/lib/s3/storage'
import { s3Client } from '@/lib/s3/client'
import { getSystemSetting } from '@/lib/config/system-settings'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { S3_CONFIG } from '@/lib/env'
import crypto from 'crypto'
import archiver from 'archiver'
import { Readable } from 'stream'
import { PassThrough } from 'stream'
import { Upload } from '@aws-sdk/lib-storage'

interface FileParams {
  name: string
  mimeType?: string
  relativePath?: string
  isDirectory?: boolean
  parentId?: string
  transferCodeId: string
  userId: string
  sessionId?: string
}

interface FileUploadParams extends FileParams {
  mimeType: string
  size: number
  s3BasePath: string
  uploadToken: string
}

export class FileService {
  private s3Service: S3StorageService
  private readonly s3Client: typeof s3Client

  constructor() {
    this.s3Service = S3StorageService.getInstance()
    this.s3Client = s3Client
  }

  /**
   * 验证上传令牌
   */
  private async verifyUploadToken(token: string, s3BasePath: string): Promise<boolean> {
    const uploadToken = await prisma.uploadToken.findUnique({
      where: { token }
    })

    if (!uploadToken) return false

    // 验证令牌是否过期
    if (uploadToken.expiresAt < new Date()) {
      await prisma.uploadToken.delete({ where: { token } })
      return false
    }

    // 只验证s3BasePath是否匹配，因为uploadToken本身已经与正确的transferCode关联
    if (uploadToken.s3BasePath !== s3BasePath) return false

    // 验证成功后删除令牌（一次性使用）
    await prisma.uploadToken.delete({ where: { token } })
    return true
  }

  /**
   * 获取会话相关的S3基础路径
   * @private
   */
  private async getSessionS3BasePath(sessionId: string): Promise<string> {
    const session = await prisma.transferSession.findUnique({
      where: { id: sessionId },
      select: { linkedTransferCodeId: true }
    })

    if (!session) throw new Error('会话不存在')

    // 生成S3基础路径
    if (!session.linkedTransferCodeId) throw new Error('会话未关联')
    return await this.s3Service.generateS3BasePath(session.linkedTransferCodeId)
  }

  /**
   * 获取上传URL
   */
  async getUploadUrl(params: FileParams) {
    try {
      const { name, mimeType, relativePath, transferCodeId, sessionId } = params
      const uploadUrlExpireSeconds = await getSystemSetting<number>('UPLOAD_URL_EXPIRE_SECONDS')

      // 获取S3基础路径
      const s3BasePath = await this.getSessionS3BasePath(sessionId!)

      // 生成上传令牌
      const uploadToken = await prisma.uploadToken.create({
        data: {
          token: crypto.randomUUID(),
          s3BasePath,
          transferCodeId,
          expiresAt: new Date(Date.now() + uploadUrlExpireSeconds * 1000)
        }
      })

      // 生成预签名URL
      const { url, fields } = await this.s3Service.createPresignedPost({
        Key: this.s3Service.getFullS3Key(s3BasePath, relativePath || name),
        Fields: {
          success_action_status: '200',
          'Content-Type': mimeType || 'application/octet-stream'
        },
        Expires: uploadUrlExpireSeconds
      })

      return {
        uploadUrl: url,
        uploadFields: fields,
        s3BasePath,
        uploadToken: uploadToken.token,
        id: uploadToken.id
      }
    } catch (error) {
      console.error('Get upload URL error:', error)
      throw error
    }
  }

  /**
   * 创建文件夹记录
   */
  async createFolderRecord(params: FileParams) {
    const { name, relativePath, parentId, transferCodeId, userId, sessionId } = params

    // 获取S3基础路径
    const s3BasePath = await this.getSessionS3BasePath(sessionId!)

    // 创建文件夹记录
    const folder = await prisma.file.create({
      data: {
        name,
        mimeType: 'application/x-directory',
        size: 0,
        relativePath: relativePath || name,
        isDirectory: true,
        parentId,
        s3BasePath
      }
    })

    // 创建关联记录
    await prisma.fileToTransferCode.create({
      data: {
        fileId: folder.id,
        transferCodeId
      }
    })

    // 更新传输码使用次数
    if (userId) {
      await prisma.transferCodeUsage.create({
        data: {
          transferCodeId,
          userId,
          status: 'SUCCESS',
          ipAddress: null,
          userAgent: null
        }
      })
    }

    return folder
  }

  /**
   * 创建文件记录（仅在上传成功后调用）
   */
  async createFileRecord(params: FileUploadParams) {
    const {
      name,
      mimeType,
      size,
      relativePath,
      isDirectory = false,
      parentId,
      transferCodeId,
      s3BasePath,
      uploadToken
    } = params

    // 验证上传令牌
    const isValid = await this.verifyUploadToken(uploadToken, s3BasePath)
    if (!isValid) throw new Error('无效的上传令牌')

    // 创建文件记录
    const file = await prisma.file.create({
      data: {
        name,
        mimeType,
        size,
        relativePath: relativePath || name,
        isDirectory,
        parentId,
        s3BasePath
      }
    })

    // 创建关联记录
    await prisma.fileToTransferCode.create({
      data: {
        fileId: file.id,
        transferCodeId
      }
    })

    return file
  }

  /**
   * 获取文件下载URL
   * @param fileId 文件ID
   * @param transferCodeId 传输码ID，用于验证文件访问权限
   */
  async getDownloadUrl(fileId: string, transferCodeId: string): Promise<{ url: string }> {
    try {
      // 查找文件记录，同时验证文件是否属于指定的传输码
      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          transferCodes: {
            some: {
              transferCodeId
            }
          }
        }
      })

      if (!file) throw new Error('文件不存在或无权访问')

      // 获取预签名下载URL
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: this.s3Service.getFullS3Key(file.s3BasePath, file.relativePath)
      })

      const downloadUrlExpireSeconds = await getSystemSetting<number>('DOWNLOAD_URL_EXPIRE_SECONDS')
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: downloadUrlExpireSeconds
      })

      return { url }
    } catch (error) {
      console.error('Get download URL error:', error)
      throw error
    }
  }

  /**
   * 获取压缩包下载URL
   * @param transferCodeId 传输码ID
   */
  async getCompressDownloadUrl(transferCodeId: string): Promise<{ url: string }> {
    try {
      // 获取预签名下载URL
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: this.s3Service.getCompressS3Key(transferCodeId)
      })

      const downloadUrlExpireSeconds = await getSystemSetting<number>('DOWNLOAD_URL_EXPIRE_SECONDS')
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: downloadUrlExpireSeconds
      })

      return { url }
    } catch (error) {
      console.error('Get compress download URL error:', error)
      throw error
    }
  }

  /**
   * 将文件添加到压缩包
   * 注意：此方法每次都会创建新的压缩包，适用于单文件压缩，不适合批量压缩
   * 批量压缩请使用finalizeCompress方法
   * @param fileId 文件ID
   * @param transferCodeId 传输码ID
   */
  async addFileToCompress(fileId: string, transferCodeId: string): Promise<void> {
    try {
      // 查找文件记录
      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          transferCodes: {
            some: {
              transferCodeId
            }
          }
        }
      })

      if (!file) throw new Error('文件不存在或无权访问')

      // 从S3下载文件
      const getCommand = new GetObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: this.s3Service.getFullS3Key(file.s3BasePath, file.relativePath)
      })

      const { Body } = await this.s3Client.send(getCommand)
      if (!Body) throw new Error('无法获取文件内容')

      // 创建临时压缩包只包含当前文件
      const archive = archiver('zip', {
        zlib: { level: 1 } // 使用最低压缩级别以提高性能
      })

      // 设置错误处理
      archive.on('error', (err) => {
        console.error('Archiver error:', err)
      })

      // 设置警告处理
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('压缩警告 (ENOENT):', err)
        } else {
          console.error('压缩警告:', err)
        }
      })

      // 创建通道用于上传到S3
      const passThrough = new PassThrough()
      archive.pipe(passThrough)

      // 添加文件到压缩包
      archive.append(Body as Readable, {
        name: file.relativePath || file.name
      })

      // 完成压缩但不等待
      archive.finalize()

      // 上传到S3
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: S3_CONFIG.bucket,
          Key: this.s3Service.getCompressS3Key(transferCodeId),
          Body: passThrough
        }
      })

      // 等待上传完成
      await upload.done()
    } catch (error) {
      console.error('Add file to compress error:', error)
      throw error
    }
  }

  /**
   * 完成压缩包
   * @param transferCodeId 传输码ID
   */
  async finalizeCompress(transferCodeId: string): Promise<void> {
    try {
      // 获取所有文件列表
      const files = await prisma.file.findMany({
        where: {
          transferCodes: {
            some: {
              transferCodeId
            }
          },
          isDirectory: false // 只获取文件,不包括文件夹
        }
      })

      if (files.length === 0) {
        // 创建一个空的压缩包
        const emptyArchive = archiver('zip')
        const passThrough = new PassThrough()
        emptyArchive.pipe(passThrough)

        // 添加一个空文件
        emptyArchive.append('这个文件夹是空的', { name: 'README.txt' })

        await emptyArchive.finalize()

        // 上传到S3
        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: S3_CONFIG.bucket,
            Key: this.s3Service.getCompressS3Key(transferCodeId),
            Body: passThrough
          }
        })

        await upload.done()
        return
      }

      // 创建压缩包
      const archive = archiver('zip', {
        zlib: { level: 1 } // 使用最低压缩级别，提高速度
      })

      // 设置错误处理
      archive.on('error', (err) => {
        console.error('压缩包创建错误:', err)
      })

      // 创建通道用于上传到S3
      const passThrough = new PassThrough()
      archive.pipe(passThrough)

      // 设置警告处理
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('压缩警告 (ENOENT):', err)
        } else {
          console.error('压缩警告:', err)
        }
      })

      // 每次处理少量文件，避免内存问题
      const batchSize = 5 // 调整批处理大小
      let processedFiles = 0
      const totalFiles = files.length

      try {
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize)

          // 顺序处理文件，避免并发问题
          for (const file of batch) {
            try {
              // 从S3下载文件
              const getCommand = new GetObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: this.s3Service.getFullS3Key(file.s3BasePath, file.relativePath)
              })

              const { Body } = await this.s3Client.send(getCommand)
              if (!Body) continue

              // 添加文件到压缩包，保持目录结构
              archive.append(Body as Readable, {
                name: file.name,
                prefix: file.relativePath ? file.relativePath.split('/').slice(0, -1).join('/') : ''
              })

              // 增加处理文件计数
              processedFiles++

              // 更新压缩进度 - 还原原始进度计算逻辑
              const progress = Math.round((processedFiles / totalFiles) * 100)
              await prisma.transferCode.update({
                where: { id: transferCodeId },
                data: {
                  compressProgress: progress
                }
              })

              // 给一点时间处理流，避免内存爆炸
              await new Promise((resolve) => setTimeout(resolve, 300))
            } catch (error) {
              console.error(`处理文件失败 ${file.id}:`, error)
            }
          }

          // 每批处理完成后，给系统一点喘息时间，释放内存
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error('处理文件过程中出错:', error)
      }

      // 设置完成回调
      archive.on('end', () => {
        // 完成压缩
      })

      // 完成压缩但不等待
      archive.finalize()

      // 上传到S3
      try {
        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: S3_CONFIG.bucket,
            Key: this.s3Service.getCompressS3Key(transferCodeId),
            Body: passThrough
          }
        })

        await upload.done()
      } catch (error) {
        console.error('上传压缩包时出错:', error)
        throw error
      }
    } catch (error) {
      console.error('Finalize compress error:', error)
      throw error
    }
  }
}
