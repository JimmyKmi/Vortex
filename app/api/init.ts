import { startScheduler, getSchedulerStatus as getTaskSchedulerStatus } from '@/lib/tasks/scheduler'

// 使用全局变量来保持初始化状态
declare global {
  var __isInitialized: boolean | undefined
  var __isInitializing: boolean | undefined
}

// 初始化全局变量
if (typeof global.__isInitialized === 'undefined') {
  global.__isInitialized = false
}
if (typeof global.__isInitializing === 'undefined') {
  global.__isInitializing = false
}

/**
 * 初始化应用的功能模块
 * 包括启动任务调度器等
 */
export function initApp() {
  if (global.__isInitialized) {
    console.log('应用已初始化，跳过重复初始化')
    return
  }

  if (global.__isInitializing) {
    console.log('应用正在初始化中，等待完成')
    return
  }

  try {
    global.__isInitializing = true
    console.log('开始初始化应用...')

    // 启动任务调度器
    startScheduler()

    // 设置初始化完成标志
    global.__isInitialized = true
    global.__isInitializing = false
    console.log('应用初始化完成')
  } catch (error) {
    global.__isInitializing = false
    console.error('应用初始化失败:', error)
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): {
  isRunning: boolean
  startedAt: Date | null
  isInitialized: boolean
} {
  return {
    ...getTaskSchedulerStatus(),
    isInitialized: global.__isInitialized || false
  }
}

/**
 * 初始化调度器
 */
export function initScheduler(): boolean {
  if (!global.__isInitialized) {
    console.log('应用未初始化，开始初始化...')
    initApp()
    return true
  }

  const status = getTaskSchedulerStatus()
  if (!status.isRunning) {
    console.log('调度器未运行，尝试启动...')
    return startScheduler()
  }
  return false
}

// 导出初始化状态
export const isInitialized = global.__isInitialized || false
