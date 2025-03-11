import { NextResponse } from 'next/server'
import { getSchedulerStatus, initScheduler } from '@/app/api/init'
import { recordHealthCheck } from '@/app/api/tasks/status/route'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 记录健康检查
    recordHealthCheck()
    
    // 获取调度器状态
    const schedulerStatus = getSchedulerStatus()
    
    // 如果调度器未运行，尝试启动
    if (!schedulerStatus.isRunning) {
      console.log("健康检查：调度器未运行，尝试启动")
      const started = initScheduler()
      if (started) {
        console.log("健康检查：调度器启动成功")
      } else {
        console.log("健康检查：调度器启动失败或已在运行")
      }
    }

    return NextResponse.json({
      status: 'ok',
      time: new Date().toISOString(),
      scheduler: schedulerStatus
    })
  } catch (error) {
    console.error("健康检查错误:", error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : '未知错误',
      time: new Date().toISOString()
    }, { status: 500 })
  }
}