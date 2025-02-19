import {
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand
} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {createPresignedPost} from "@aws-sdk/s3-presigned-post"
import {s3Client} from "./client"
import {S3_CONFIG} from "@/lib/config/env"
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

export class S3StorageService {
  private static instance: S3StorageService

  private constructor() {
  }

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
    return `transfer/${linkedTransferCodeId}`
  }

  /**
   * 获取完整的S3路径
   * @param s3BasePath S3基础路径
   * @param relativePath 文件相对路径
   * @returns 完整的S3路径
   */
  getFullS3Key(s3BasePath: string, relativePath: string): string {
    return `${s3BasePath}/${relativePath}`
  }

  /**
   * 创建预签名POST请求
   * @param params 请求参数
   * @param params.Key 文件在S3中的完整路径
   * @param params.Fields 额外的表单字段
   * @param params.Expires 链接过期时间（秒）
   * @returns 预签名URL和表单字段
   */
  async createPresignedPost(params: {
    Key: string;
    Fields?: Record<string, string>;
    Expires?: number;
  }): Promise<{
    url: string;
    fields: Record<string, string>;
  }> {
    if (!S3_CONFIG.bucket) {
      throw new Error('S3 bucket not configured')
    }

    const {url, fields} = await createPresignedPost(s3Client, {
      Bucket: S3_CONFIG.bucket,
      Key: params.Key,
      Conditions: [
        ['content-length-range', 0, 1024 * 1024 * 1024], // 最大 1GB
        ['starts-with', '$Content-Type', '']
      ],
      Fields: params.Fields,
      Expires: params.Expires
    })

    return {url, fields}
  }

  /**
   * 获取文件下载URL
   * @param s3BasePath S3基础路径
   * @param relativePath 文件相对路径
   * @param fileName 下载时的文件名
   * @returns 下载URL
   */
  async getDownloadUrl(s3BasePath: string, relativePath: string, fileName: string): Promise<string> {
    const s3Key = this.getFullS3Key(s3BasePath, relativePath)
    const command = new GetObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    })
    return await getSignedUrl(s3Client, command, {expiresIn: 3600})
  }

  /**
   * 删除单个文件
   * @param s3BasePath S3基础路径
   * @param relativePath 文件相对路径
   */
  async deleteFile(s3BasePath: string, relativePath: string): Promise<void> {
    const s3Key = this.getFullS3Key(s3BasePath, relativePath)
    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: s3Key,
    })
    await s3Client.send(command)
  }

  /**
   * 批量删除文件
   * @param files 文件列表，每个文件包含 s3BasePath 和 relativePath
   */
  async deleteFiles(files: Array<{ s3BasePath: string, relativePath: string }>): Promise<void> {
    if (files.length === 0) return

    const command = new DeleteObjectsCommand({
      Bucket: S3_CONFIG.bucket,
      Delete: {
        Objects: files.map(({s3BasePath, relativePath}) => ({
          Key: this.getFullS3Key(s3BasePath, relativePath)
        })),
        Quiet: true
      },
    })
    await s3Client.send(command)
  }

  /**
   * 检查文件是否存在
   * @param s3BasePath S3基础路径
   * @param relativePath 文件相对路径
   * @returns 是否存在
   */
  async fileExists(s3BasePath: string, relativePath: string): Promise<boolean> {
    try {
      const s3Key = this.getFullS3Key(s3BasePath, relativePath)
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.bucket,
        Key: s3Key,
      })
      await s3Client.send(command)
      return true
    } catch (error) {
      return false
    }
  }
} 