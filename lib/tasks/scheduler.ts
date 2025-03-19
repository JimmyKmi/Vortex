import { cleanupTask } from './cleanup'

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
  return isDev ? 60 * 1000 : 10 * 60 * 1000
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
    console.log(`执行定时清理任务`)
  }
  
  try {
    // 执行清理任务
    // 在调度器调用时不输出详细日志，减少日志污染
    await cleanupTask(true)
    
    // 更新最后执行时间
    global.__schedulerStatus.lastExecutionTime = now
  } catch (error) {
    console.error(`定时清理任务失败:`, error)
  }
}

/**
 * 启动任务调度器
 */
export function startScheduler() {
  if (global.__schedulerStatus.isRunning) {
    console.log('调度器已在运行中')
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

    console.log(`任务调度器已启动，每${intervalMinutes}分钟执行一次`)
    return true
  } catch (error) {
    console.error('启动调度器失败:', error)
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
