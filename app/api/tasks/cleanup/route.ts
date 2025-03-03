import { NextResponse } from 'next/server'
import { cleanupTask } from '@/lib/tasks/cleanup'
import { recordCleanupTask } from '@/app/api/tasks/status/route'

// 执行清理任务的API路由
export const GET = async () => {
  try {
    console.log('通过API路由执行清理任务...')
    // 记录清理任务执行
    recordCleanupTask();
    
    await cleanupTask()
    
    return NextResponse.json({
      success: true,
      message: '清理任务执行成功',
      time: new Date().toISOString()
    })
  } catch (error) {
    console.error('清理任务执行失败:', error)
    return NextResponse.json({
      success: false,
      message: '清理任务执行失败',
      error: error instanceof Error ? error.message : '未知错误',
      time: new Date().toISOString()
    }, { status: 500 })
  }
}

// 确保使用Node.js运行时，这样PrismaClient可以正常工作
export const runtime = 'nodejs' 