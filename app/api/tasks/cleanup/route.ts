import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { cleanupTask } from '@/lib/tasks/cleanup'
import { recordCleanupTask } from '@/app/api/tasks/status/route'
import { apiLogger } from '@/lib/utils/logger'

// 执行清理任务的API路由
export const GET = async () => {
  try {
    apiLogger.info('Executing cleanup task via API')
    // 记录清理任务执行
    recordCleanupTask()

    // 手动触发的任务显示详细日志(silent=false)
    const results = await cleanupTask(false)

    apiLogger.info({ results }, 'Cleanup task executed successfully via API')

    return ResponseSuccess({
      message: 'Cleanup task executed successfully',
      results,
      time: new Date().toISOString()
    })
  } catch (error) {
    apiLogger.error({ err: error }, 'Failed to execute cleanup task via API')
    
    return ResponseThrow('CleanupTaskFailed', 500)
  }
}

// 确保使用Node.js运行时，这样PrismaClient可以正常工作
export const runtime = 'nodejs'
