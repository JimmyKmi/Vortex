import {prisma} from "@/lib/prisma"
import {S3StorageService} from "@/lib/s3/storage"
import {s3Client} from "@/lib/s3/client"
import {getSystemSetting} from "@/lib/config/system-settings"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {GetObjectCommand} from "@aws-sdk/client-s3"
import {S3_CONFIG} from "@/lib/config/env"
import crypto from 'crypto'

interface FileParams {
  name: string;
  mimeType?: string;
  relativePath?: string;
  isDirectory?: boolean;
  parentId?: string;
  transferCodeId: string;
  userId: string;
  sessionId?: string;
}

interface FileUploadParams extends FileParams {
  mimeType: string;
  size: number;
  s3BasePath: string;
  uploadToken: string;
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
      where: {token}
    })

    if (!uploadToken) return false

    // 验证令牌是否过期
    if (uploadToken.expiresAt < new Date()) {
      await prisma.uploadToken.delete({where: {token}})
      return false
    }

    // 只验证s3BasePath是否匹配，因为uploadToken本身已经与正确的transferCode关联
    if (uploadToken.s3BasePath !== s3BasePath) return false

    // 验证成功后删除令牌（一次性使用）
    await prisma.uploadToken.delete({where: {token}})
    return true
  }

  /**
   * 获取会话相关的S3基础路径
   * @private
   */
  private async getSessionS3BasePath(sessionId: string): Promise<string> {
    const session = await prisma.transferSession.findUnique({
      where: {id: sessionId},
      select: {linkedTransferCodeId: true}
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
      const {name, mimeType, relativePath, transferCodeId, sessionId} = params
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
      const {url, fields} = await this.s3Service.createPresignedPost({
        Key: `${s3BasePath}/${relativePath || name}`,
        Fields: {
          'success_action_status': '200',
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
    const {
      name,
      relativePath,
      parentId,
      transferCodeId,
      userId,
      sessionId
    } = params

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
   */
  async getDownloadUrl(params: {
    name: string;
    relativePath: string;
    transferCodeId: string;
  }): Promise<{ url: string }> {
    try {
      // 查找文件记录
      const file = await prisma.file.findFirst({
        where: {
          name: params.name,
          relativePath: params.relativePath,
          transferCodes: {
            some: {
              transferCodeId: params.transferCodeId
            }
          }
        }
      })

      if (!file) throw new Error("文件不存在")

      // 获取预签名下载URL
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: `${file.s3BasePath}/${file.relativePath}`
      })

      const downloadUrlExpireSeconds = await getSystemSetting<number>('DOWNLOAD_URL_EXPIRE_SECONDS')
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: downloadUrlExpireSeconds
      })

      return {url}

    } catch (error) {
      console.error("Get download URL error:", error)
      throw error
    }
  }
} 