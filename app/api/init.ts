import {startScheduler, getSchedulerStatus as getTaskSchedulerStatus} from "@/lib/tasks/scheduler"

// 是否已经初始化的标志
let isInitialized = false

/**
 * 初始化应用的功能模块
 * 包括启动任务调度器等
 */
export function initApp() {
  if (isInitialized) return

  try {
    // 启动任务调度器
    startScheduler()

    // 设置初始化完成标志
    isInitialized = true
    console.log("应用初始化完成")
  } catch (error) {
    console.error("应用初始化失败:", error)
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): { isRunning: boolean; startedAt: Date | null; isInitialized: boolean } {
  return {
    ...getTaskSchedulerStatus(),
    isInitialized
  }
}

/**
 * 初始化调度器
 */
export function initScheduler(): boolean {
  if (!isInitialized) {
    initApp()
    return true
  }

  const status = getTaskSchedulerStatus()
  if (!status.isRunning) return startScheduler()
  return false
}

// 自动初始化应用
// 在导入本模块时执行
initApp() 