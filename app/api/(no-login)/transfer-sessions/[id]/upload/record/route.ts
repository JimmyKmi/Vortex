import {NextRequest} from "next/server"
import {FileService} from "@/lib/services/file-service"
import {prisma} from "@/lib/prisma"
import {z} from "zod"
import {validateTransferSession} from "@/lib/utils/transfer-session"
import {ResponseSuccess, ResponseThrow} from "@/lib/utils/response"

const fileService = new FileService()

/**
 * 创建文件记录接口
 *
 * 该接口用于：
 * 1. 创建已上传文件的数据库记录
 * 2. 创建传输码使用记录
 * 3. 更新会话活动时间
 *
 * @route POST /api/transfer-sessions/[id]/upload/record
 * @params
 *   - id: string - 传输会话 ID（路径参数）
 *
 * @body
 *   - name: string - 文件名称
 *   - mimeType: string - 文件 MIME 类型
 *   - size: number - 文件大小(字节)
 *   - relativePath?: string - 相对路径
 *   - isDirectory?: boolean - 是否为目录
 *   - parentId?: string - 父文件夹ID
 *   - s3BasePath: string - 存储基础路径
 *   - uploadToken: string - 上传令牌
 *
 * @returns
 *   成功:
 *   - code: "Success"
 *   - data: FileRecord
 *
 *   失败:
 *   - code: "InvalidRequest" | "InvalidParams" | "ValidationError" | "CreateFileRecordFailed" | TransferSessionValidationError
 *   - errors?: ZodError - 验证错误信息
 */

// 请求体验证模式
const requestSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  relativePath: z.string().optional(),
  isDirectory: z.boolean().optional(),
  parentId: z.string().optional(),
  s3BasePath: z.string(),
  uploadToken: z.string()
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证请求体是否为空
    const body = await req.json().catch(() => null)
    if (!body) return ResponseThrow("InvalidRequest")

    const sessionId = params.id
    if (!sessionId) return ResponseThrow("InvalidParams")

    // 获取会话信息
    const session = await prisma.transferSession.findUnique({
      where: {id: sessionId},
      include: {
        transferCode: {
          include: {
            user: true
          }
        },
        linkedTransferCode: true
      }
    })

    // 验证会话
    const validationResult = await validateTransferSession(req, sessionId, ["UPLOADING"], ["UPLOAD"], session)
    if (!validationResult.valid) return ResponseThrow(validationResult.code ?? "InvalidSession")

    // 确保下载码存在
    if (!session?.linkedTransferCode) return ResponseThrow("InternalServerError")

    // 验证请求数据
    const validatedData = requestSchema.parse(body)

    // 创建文件记录
    const file = await fileService.createFileRecord({
      ...validatedData,
      transferCodeId: session.linkedTransferCode.id,
      userId: session.transferCode.user.id
    })

    // 创建使用记录
    await prisma.transferCodeUsage.create({
      data: {
        transferCodeId: session.transferCodeId,
        userId: session.transferCode.user.id,
        status: "SUCCESS",
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || undefined
      }
    })

    // 更新会话活动时间
    await prisma.transferSession.update({
      where: {id: sessionId},
      data: {}
    })

    return ResponseSuccess(file)
  } catch (error) {
    // 记录详细错误信息
    console.error("Create file record error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined
    })

    // Zod 验证错误
    if (error instanceof z.ZodError) return ResponseThrow("ValidationError")

    // 返回格式化的错误响应
    return ResponseThrow("CreateFileRecordFailed")
  }
} 