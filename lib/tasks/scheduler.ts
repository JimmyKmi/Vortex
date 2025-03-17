import { cleanupTask } from './cleanup'

// 全局变量，存储定时器的引用
let cleanupInterval: NodeJS.Timeout | null = null

// 存储调度器状态
const schedulerStatus = {
  isRunning: false,
  startedAt: null as Date | null
}

/**
 * 启动任务调度器
 */
export function startScheduler() {
  if (schedulerStatus.isRunning) {
    console.log('调度器已在运行中')
    return false
  }

  try {
    // 立即执行一次清理任务
    void cleanupTask()

    // 每10分钟执行一次清理任务
    cleanupInterval = setInterval(
      () => {
        void cleanupTask()
      },
      10 * 60 * 1000
    ) // 10分钟

    // 更新调度器状态
    schedulerStatus.isRunning = true
    schedulerStatus.startedAt = new Date()

    console.log('任务调度器已启动')
    return true
  } catch (error) {
    console.error('启动调度器失败:', error)
    return false
  }
}

/**
 * 停止任务调度器
 */
export function stopScheduler() {
  if (!schedulerStatus.isRunning) {
    console.log('调度器未在运行')
    return false
  }

  try {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }

    // 更新调度器状态
    schedulerStatus.isRunning = false

    console.log('任务调度器已停止')
    return true
  } catch (error) {
    console.error('停止调度器失败:', error)
    return false
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus() {
  return {
    isRunning: schedulerStatus.isRunning,
    startedAt: schedulerStatus.startedAt
  }
}
