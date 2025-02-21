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
} 