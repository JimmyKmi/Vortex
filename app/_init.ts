// 这个文件会在应用启动时被导入，用于启动定时任务
// 它不包含任何导出，只用于执行副作用（启动定时任务）

// 强制导入初始化模块
import './api/init'

// 仅在服务器端运行
if (typeof window === 'undefined') {
  console.log('服务器初始化模块已加载')
} 