import { startScheduler, getSchedulerStatus as getTaskSchedulerStatus } from '@/lib/tasks/scheduler'

// 使用全局变量来保持初始化状态
// 注意：在全局声明中必须使用var，因为这些属性将附加到global对象上
// 使用let或const在全局声明中不会正确地挂载到global对象
declare global {
  // eslint-disable-next-line no-var
  var __isInitialized: boolean | undefined
  // eslint-disable-next-line no-var
  var __isInitializing: boolean | undefined
  // eslint-disable-next-line no-var
  var __initLock: Promise<void> | null
  // eslint-disable-next-line no-var
  var __initTimestamp: number | null
}

// 初始化全局变量
if (typeof global.__isInitialized === 'undefined') {
  global.__isInitialized = false
}
if (typeof global.__isInitializing === 'undefined') {
  global.__isInitializing = false
}
if (typeof global.__initLock === 'undefined') {
  global.__initLock = null
}
if (typeof global.__initTimestamp === 'undefined') {
  global.__initTimestamp = null
}

/**
 * 初始化应用的功能模块
 * 包括启动任务调度器等
 * @returns Promise<boolean> 初始化是否成功的Promise
 */
export async function initApp(): Promise<boolean> {
  // 如果已初始化且未过期（30分钟内），跳过
  const now = Date.now()
  const initAge = global.__initTimestamp ? now - global.__initTimestamp : null
  
  if (global.__isInitialized && initAge !== null && initAge < 30 * 60 * 1000) {
    console.log(`应用已初始化（${Math.floor(initAge / 1000)}秒前），跳过重复初始化`)
    return true
  }

  // 如果已有初始化过程在进行，等待其完成
  if (global.__initLock) {
    console.log('应用正在被其他进程初始化，等待完成')
    try {
      await global.__initLock
      return global.__isInitialized === true
    } catch (error) {
      console.error('等待其他初始化进程失败:', error)
      return false
    }
  }

  // 创建初始化锁并存储解析/拒绝函数
  const lockState: {
    resolve: (() => void) | null;
    reject: ((err: Error) => void) | null;
  } = {
    resolve: null,
    reject: null
  }
  
  global.__initLock = new Promise<void>((resolve, reject) => {
    lockState.resolve = resolve
    lockState.reject = reject
  })
  
  // 标记开始初始化
  global.__isInitializing = true

  try {
    console.log('开始初始化应用...')

    // 启动任务调度器
    const result = startScheduler()

    if (result) {
      // 设置初始化完成标志
      global.__isInitialized = true
      global.__initTimestamp = Date.now()
      console.log('应用初始化完成')
    } else {
      // 调度器可能已在运行，也视为初始化成功
      if (getTaskSchedulerStatus().isRunning) {
        global.__isInitialized = true
        global.__initTimestamp = Date.now()
        console.log('调度器已在运行中，视为初始化完成')
      } else {
        console.error('应用初始化失败: 无法启动调度器')
      }
    }

    if (lockState.resolve) lockState.resolve()
    return global.__isInitialized === true
  } catch (error) {
    console.error('应用初始化失败:', error)
    if (lockState.reject) lockState.reject(error instanceof Error ? error : new Error(String(error)))
    return false
  } finally {
    global.__isInitializing = false
    global.__initLock = null
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): {
  isRunning: boolean
  startedAt: Date | null
  isInitialized: boolean
  initTime: number | null
  lastExecutionTime: Date | null
} {
  return {
    ...getTaskSchedulerStatus(),
    isInitialized: global.__isInitialized === true,
    initTime: global.__initTimestamp
  }
}

/**
 * 初始化调度器
 */
export async function initScheduler(): Promise<boolean> {
  // 检查调度器是否需要初始化
  const status = getTaskSchedulerStatus()
  
  if (status.isRunning) {
    // 调度器已在运行，无需操作
    return false
  }

  // 调度器未运行，尝试初始化
  return await initApp()
}

// 导出初始化状态
export const isInitialized = global.__isInitialized === true
