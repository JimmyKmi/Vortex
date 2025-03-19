// 这个文件会在应用启动时被导入，用于启动定时任务
// 它不包含任何导出，只用于执行副作用（启动定时任务）

// 强制导入初始化模块
import { initApp, isInitialized } from './api/init'
import { systemLogger } from '@/lib/utils/logger'

// 使用全局标记记录是否已经执行过初始化检查
declare global {
  // eslint-disable-next-line no-var
  var __initCheckDone: boolean | undefined
}

// 初始化全局检查标记
if (typeof global.__initCheckDone === 'undefined') {
  global.__initCheckDone = false
}

// 仅在服务器端运行且未执行过初始化检查时执行
if (typeof window === 'undefined' && !global.__initCheckDone) {
  global.__initCheckDone = true
  systemLogger.info('Server-side startup detected, checking application initialization...')

  if (!isInitialized) {
    systemLogger.info('Application not initialized, starting initialization process')
    // 使用void操作符忽略Promise结果，因为这是应用启动时的初始化
    void initApp()
  } else {
    systemLogger.info('Application already initialized, skipping startup initialization')
  }
}
