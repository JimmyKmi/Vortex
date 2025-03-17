/**
 * 统一的API响应处理工具
 * 提供标准的Restful响应格式和错误处理
 */

import { NextResponse } from 'next/server'

/**
 * 标准错误码定义
 * 包含错误码、对应的HTTP状态码和错误描述
 */
export const ErrorCodes = {
  // 成功
  Success: { status: 200 },

  // 客户端错误 (4xx)
  InvalidParams: { status: 400 },
  Unauthorized: { status: 401 },
  Forbidden: { status: 403 },
  NotFound: { status: 404 },
  MethodNotAllowed: { status: 405 },
  Conflict: { status: 409 },

  // 会话相关错误
  InvalidSession: { status: 401 },

  // 传输相关错误
  TransferCodeExpired: { status: 401 },
  TransferCodeDisabled: { status: 403 },
  TransferCodeNotFound: { status: 404 },

  // 服务器错误 (5xx)
  InternalServerError: { status: 500 },
  DatabaseError: { status: 500 },
  ServiceUnavailable: { status: 503 }
} as const

// 错误码类型
export type ErrorCode = keyof typeof ErrorCodes | (string & {})

/**
 * 标准响应格式
 */
export interface ApiResponse<T = undefined> {
  code: ErrorCode
  data?: T
}

/**
 * 创建成功响应
 * @param data - 响应数据（可选）
 * @param init - 响应配置（可选）
 * @returns NextResponse对象
 * @example
 * return ResponseSuccess({ user: { id: 1, name: 'test' } })
 */
export function ResponseSuccess<T>(data?: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(
    {
      code: 'Success',
      ...(data !== undefined && { data })
    } satisfies ApiResponse<T>,
    init
  )
}

/**
 * 创建错误响应
 * @param code - 错误码，可以是预定义的ErrorCode或自定义字符串
 * @param status - 自定义HTTP状态码（可选，默认从ErrorCodes中获取或500）
 * @param init - 响应配置（可选）
 * @returns NextResponse对象
 * @example
 * // 使用预定义错误码
 * return ResponseThrow("SessionExpired")
 * // 使用自定义错误码和状态码
 * return ResponseThrow("CustomError", 400)
 */
export function ResponseThrow(code: ErrorCode, status?: number, init?: ResponseInit): NextResponse {
  const finalStatus = ErrorCodes[code as keyof typeof ErrorCodes]?.status ?? status ?? 500
  return NextResponse.json({ code } satisfies ApiResponse, { ...init, status: finalStatus })
}
