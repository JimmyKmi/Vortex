// 错误码映射表
const errorMessages: { [key: string]: string } = {
  // 通用错误
  'ServerError': '服务器错误',
  'DatabaseError': '数据库错误',
  'InvalidParams': '无效的参数',
  'ValidationError': '验证失败',
  'Unauthorized': '请先登录',

  // 会话相关
  'InvalidSession': '无效的会话',
  'SessionExpired': '会话已过期',

  // 传输码相关
  'TransferCodeNotFound': '传输码不存在',
  'TransferCodeDisabled': '传输码已被禁用',
  'TransferCodeExpired': '传输码已过期',
  'TransferCodeUsageExceeded': '该传输码已达到使用次数上限',
  'GetUploadUrlFailed': '获取上传 URL 失败',
  'CreateFileRecordFailed': '创建文件记录失败',
  'InvalidRequest': '无效的请求',
}

/**
 * 获取错误码对应的中文消息
 * @param code 错误码
 * @returns 对应的中文消息，如果没有找到对应的消息，则返回错误码本身
 */
export function getErrorMessage(code: string): string {
  return errorMessages[code] || code
}

/**
 * 从API响应错误中获取错误消息
 * @param error Axios错误对象
 * @returns 格式化后的错误消息
 */
export const getApiErrorMessage = (error: any) => {
  const code = error.response?.data?.code || error.code || "UnknownError"
  
  return errorMessages[code] || error.message || "未知错误"
} 