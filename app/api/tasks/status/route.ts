import { NextResponse } from 'next/server'
import { getSchedulerStatus } from '@/app/api/init'

// 全局状态追踪
const apiStats = {
  lastHealthCheck: null as Date | null,
  healthCheckCount: 0,
  cleanupTaskCount: 0
};

/**
 * 记录健康检查调用
 */
export function recordHealthCheck() {
  apiStats.lastHealthCheck = new Date();
  apiStats.healthCheckCount++;
}

/**
 * 记录清理任务调用
 */
export function recordCleanupTask() {
  apiStats.cleanupTaskCount++;
}

export async function GET() {
  try {
    // 获取调度器状态
    const schedulerStatus = getSchedulerStatus();

    return NextResponse.json({
      scheduler: schedulerStatus,
      stats: {
        lastHealthCheck: apiStats.lastHealthCheck,
        healthCheckCount: apiStats.healthCheckCount,
        cleanupTaskCount: apiStats.cleanupTaskCount
      },
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error("获取任务状态错误:", error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : '未知错误',
      time: new Date().toISOString()
    }, { status: 500 });
  }
}

// 确保使用Node.js运行时
export const runtime = 'nodejs' 