import { NextResponse } from 'next/server'

// 导入初始化模块，确保在任何API请求时都能触发初始化
import '@/app/api/init'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    name: "Jimmy File API",
    version: "0.1.0",
    status: "ok",
    time: new Date().toISOString()
  })
} 