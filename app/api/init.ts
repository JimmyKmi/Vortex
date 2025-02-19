import { startScheduler } from "@/lib/tasks/scheduler"

// 在开发环境下，由于热重载会多次执行这个文件
// 使用这个标志来确保调度器只启动一次
let isSchedulerStarted = false

if (!isSchedulerStarted) {
  startScheduler()
  isSchedulerStarted = true
} 