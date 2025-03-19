import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { getSchedulerStatus } from '@/app/api/init'
import logger from '@/lib/utils/logger'

// 全局状态追踪
const apiStats = {
  lastHealthCheck: null as Date | null,
  healthCheckCount: 0,
  cleanupTaskCount: 0
}

/**
 * 记录健康检查调用
 */
export function recordHealthCheck() {
  apiStats.lastHealthCheck = new Date()
  apiStats.healthCheckCount++
  logger.debug(`Health check recorded (total: ${apiStats.healthCheckCount})`)
}

/**
 * 记录清理任务调用
 */
export function recordCleanupTask() {
  apiStats.cleanupTaskCount++
  logger.debug(`Cleanup task recorded (total: ${apiStats.cleanupTaskCount})`)
}

export async function GET() {
  try {
    logger.debug('Getting task status')
    // 获取调度器状态
    const schedulerStatus = getSchedulerStatus()

    return ResponseSuccess({
      scheduler: schedulerStatus,
      stats: {
        lastHealthCheck: apiStats.lastHealthCheck,
        healthCheckCount: apiStats.healthCheckCount,
        cleanupTaskCount: apiStats.cleanupTaskCount
      },
      time: new Date().toISOString()
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to get task status')
    return ResponseThrow('InternalServerError')
  }
}

// 确保使用Node.js运行时
export const runtime = 'nodejs'
