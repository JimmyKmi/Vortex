import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { cleanupTask } from '@/lib/tasks/cleanup'
import { recordCleanupTask } from '@/app/api/tasks/status/route'

// 执行清理任务的API路由
export const GET = async () => {
  try {
    console.log('通过API路由执行清理任务...')
    // 记录清理任务执行
    recordCleanupTask()

    // 手动触发的任务显示详细日志(silent=false)
    await cleanupTask(false)

    return ResponseSuccess({
      message: '清理任务执行成功',
      time: new Date().toISOString()
    })
  } catch (error) {
    console.error('清理任务执行失败:', error)
    
    return ResponseThrow('CleanupTaskFailed', 500)
  }
}

// 确保使用Node.js运行时，这样PrismaClient可以正常工作
export const runtime = 'nodejs'
