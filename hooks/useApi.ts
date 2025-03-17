import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/utils/error-messages'

/**
 * API调用选项接口
 */
interface ApiCallOptions {
  errorMessage?: string // 自定义错误消息
  showErrorToast?: boolean // 是否显示错误提示
  onSuccess?: (data: any) => void // 成功回调
  onError?: (error: any) => void // 错误回调
  finallyAction?: () => void // 最终执行的操作
}

/**
 * API调用自定义Hook
 * 提供统一的API请求处理机制，包括错误处理、状态管理等
 */
export function useApi() {
  /**
   * 执行API调用
   * @param apiCall - API调用Promise
   * @param options - 选项配置
   * @returns 处理后的响应数据或null
   */
  const call = async <T>(apiCall: Promise<any>, options: ApiCallOptions = {}): Promise<T | null> => {
    const { errorMessage, showErrorToast = true, onSuccess, onError, finallyAction } = options

    try {
      const response = await apiCall

      if (response.data.code !== 'Success') {
        const apiError = new Error(getApiErrorMessage(response.data))
        apiError.name = response.data.code || 'ApiError'

        if (showErrorToast) toast.error(errorMessage || getApiErrorMessage(response.data))
        if (onError) onError(apiError)

        return null
      }

      if (onSuccess) onSuccess(response.data.data)

      return response.data.data as T
    } catch (error: any) {
      console.error('API调用错误:', error)

      if (showErrorToast) toast.error(errorMessage || getApiErrorMessage(error))
      if (onError) onError(error)

      return null
    } finally {
      if (finallyAction) finallyAction()
    }
  }

  return { call }
}
