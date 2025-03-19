import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { getSchedulerStatus, initScheduler } from '@/app/api/init'
import { recordHealthCheck } from '@/app/api/tasks/status/route'
import { apiLogger } from '@/lib/utils/logger'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 记录健康检查
    recordHealthCheck()

    // 获取调度器状态
    const schedulerStatus = getSchedulerStatus()

    // 如果调度器未初始化或未运行并且超过5分钟，尝试启动
    // 避免在短时间内频繁尝试启动调度器
    const initAge = schedulerStatus.initTime ? Date.now() - schedulerStatus.initTime : Number.MAX_SAFE_INTEGER

    if (!schedulerStatus.isRunning && (!schedulerStatus.isInitialized || initAge > 5 * 60 * 1000)) {
      apiLogger.info('Health check: scheduler not running, attempting to start')
      const started = await initScheduler()
      if (started) {
        apiLogger.info('Health check: scheduler started successfully')
      } else {
        apiLogger.info('Health check: scheduler startup failed or already running')
      }
    }

    // 计算上次执行时间
    let lastExecutionInfo = 'never'
    if (schedulerStatus.lastExecutionTime) {
      const lastExecAge = Date.now() - new Date(schedulerStatus.lastExecutionTime).getTime()
      const minutes = Math.floor(lastExecAge / (60 * 1000))
      const seconds = Math.floor((lastExecAge % (60 * 1000)) / 1000)
      lastExecutionInfo = `${minutes}m ${seconds}s ago`
    }

    return ResponseSuccess({
      time: new Date().toISOString(),
      scheduler: {
        ...schedulerStatus,
        lastExecutionInfo
      }
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Health check error')
    return ResponseThrow('HealthCheckError', 500)
  }
}
