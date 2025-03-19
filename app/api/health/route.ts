import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { getSchedulerStatus, initScheduler } from '@/app/api/init'
import { recordHealthCheck } from '@/app/api/tasks/status/route'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 记录健康检查
    recordHealthCheck()

    // 获取调度器状态
    const schedulerStatus = getSchedulerStatus()

    // 如果调度器未初始化或未运行并且超过5分钟，尝试启动
    // 避免在短时间内频繁尝试启动调度器
    const initAge = schedulerStatus.initTime 
      ? Date.now() - schedulerStatus.initTime 
      : Number.MAX_SAFE_INTEGER
    
    if (!schedulerStatus.isRunning && (!schedulerStatus.isInitialized || initAge > 5 * 60 * 1000)) {
      console.log('健康检查：调度器未运行，尝试启动')
      const started = await initScheduler()
      if (started) {
        console.log('健康检查：调度器启动成功')
      } else {
        console.log('健康检查：调度器启动失败或已在运行')
      }
    }

    // 计算上次执行时间
    let lastExecutionInfo = '未执行'
    if (schedulerStatus.lastExecutionTime) {
      const lastExecAge = Date.now() - new Date(schedulerStatus.lastExecutionTime).getTime()
      const minutes = Math.floor(lastExecAge / (60 * 1000))
      const seconds = Math.floor((lastExecAge % (60 * 1000)) / 1000)
      lastExecutionInfo = `${minutes}分${seconds}秒前`
    }

    return ResponseSuccess({
      time: new Date().toISOString(),
      scheduler: {
        ...schedulerStatus,
        lastExecutionInfo
      }
    })
  } catch (error) {
    console.error('健康检查错误:', error)
    return ResponseThrow('HealthCheckError', 500)
  }
}
