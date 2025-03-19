// 这个文件会在应用启动时被导入，用于启动定时任务
// 它不包含任何导出，只用于执行副作用（启动定时任务）

// 强制导入初始化模块
import { initApp, isInitialized } from './api/init'

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
  console.log('检测到服务器端启动，检查是否需要初始化应用...')
  
  if (!isInitialized) {
    console.log('应用未初始化，开始初始化流程')
    // 使用void操作符忽略Promise结果，因为这是应用启动时的初始化
    void initApp() 
  } else {
    console.log('应用已初始化，跳过启动时初始化')
  }
}
