import { cleanupTask } from "./cleanup"

// 一小时的毫秒数
const ONE_HOUR = 60 * 60 * 1000

/**
 * 启动定时任务调度器
 */
export function startScheduler() {
  console.log("启动定时任务调度器...")

  // 立即执行一次清理任务
  // void cleanupTask()

  // 设置每小时执行一次清理任务
  setInterval(cleanupTask, ONE_HOUR)
} 