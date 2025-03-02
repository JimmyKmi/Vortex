import { cleanupTask } from "./cleanup"

// 十分钟的毫秒数
const TEN_MINUTES = 10 * 60 * 1000

/**
 * 启动定时任务调度器
 */
export function startScheduler() {
  console.log("启动定时任务调度器...")

  // 立即执行一次清理任务
  void cleanupTask()

  // 设置每10分钟执行一次清理任务
  setInterval(cleanupTask, TEN_MINUTES)
} 