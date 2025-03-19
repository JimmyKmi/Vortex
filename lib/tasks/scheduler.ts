import { cleanupTask } from './cleanup'
import logger from '@/lib/utils/logger'

// 全局变量，存储定时器的引用和状态
// 使用global确保在各个实例间共享
declare global {
  // eslint-disable-next-line no-var
  var __cleanupInterval: NodeJS.Timeout | null
  // eslint-disable-next-line no-var
  var __schedulerStatus: {
    isRunning: boolean
    startedAt: Date | null
    lastExecutionTime: Date | null
  }
}

// 初始化全局变量
if (typeof global.__cleanupInterval === 'undefined') {
  global.__cleanupInterval = null
}
if (typeof global.__schedulerStatus === 'undefined') {
  global.__schedulerStatus = {
    isRunning: false,
    startedAt: null,
    lastExecutionTime: null
  }
}

// 获取任务执行间隔（毫秒）
function getTaskInterval(): number {
  // 检查是否为开发环境
  const isDev = process.env.NODE_ENV === 'development'

  // 开发环境下1分钟执行一次，生产环境10分钟执行一次
  return isDev ? 1 * 60 * 1000 : 10 * 60 * 1000
}

/**
 * 执行调度任务
 */
async function executeScheduledTask(): Promise<void> {
  // 记录执行开始时间
  const now = new Date()
  const isDev = process.env.NODE_ENV === 'development'

  // 只在开发环境下打印时间戳
  if (isDev) {
    logger.debug('Executing scheduled cleanup task')
  }

  try {
    // 执行清理任务
    await cleanupTask(true)

    // 更新最后执行时间
    global.__schedulerStatus.lastExecutionTime = now
    logger.debug('Scheduled cleanup task completed')
  } catch (error) {
    logger.error({ err: error }, 'Scheduled cleanup task failed')
  }
}

/**
 * 启动任务调度器
 */
export function startScheduler() {
  if (global.__schedulerStatus.isRunning) {
    logger.info('Scheduler is already running')
    return false
  }

  try {
    // 确保清除任何可能存在的旧定时器
    if (global.__cleanupInterval) {
      clearInterval(global.__cleanupInterval)
      global.__cleanupInterval = null
    }

    // 立即执行一次清理任务
    void executeScheduledTask()

    // 获取任务执行间隔
    const interval = getTaskInterval()
    const intervalMinutes = interval / (60 * 1000)

    // 设置定时执行
    global.__cleanupInterval = setInterval(executeScheduledTask, interval)

    // 更新调度器状态
    global.__schedulerStatus.isRunning = true
    global.__schedulerStatus.startedAt = new Date()

    logger.info(`Task scheduler started, executing every ${intervalMinutes} minutes`)
    return true
  } catch (error) {
    logger.error({ err: error }, 'Failed to start scheduler')
    return false
  }
}

/**
 * 停止任务调度器
 */
export function stopScheduler() {
  if (!global.__schedulerStatus.isRunning) {
    logger.info('Scheduler is not running')
    return false
  }

  try {
    if (global.__cleanupInterval) {
      clearInterval(global.__cleanupInterval)
      global.__cleanupInterval = null
    }

    // 更新调度器状态
    global.__schedulerStatus.isRunning = false

    logger.info('Task scheduler stopped')
    return true
  } catch (error) {
    logger.error({ err: error }, 'Failed to stop scheduler')
    return false
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus() {
  return {
    isRunning: global.__schedulerStatus.isRunning,
    startedAt: global.__schedulerStatus.startedAt,
    lastExecutionTime: global.__schedulerStatus.lastExecutionTime
  }
}
