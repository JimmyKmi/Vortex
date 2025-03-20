import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {ResponseThrow} from "@/lib/utils/response";

// 获取过去7天每天传输码使用情况
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ResponseThrow('Unauthorized')

    const userId = session.user.id

    // 获取过去7天的日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 6) // 7天，包括今天

    // 初始化每天的数据结构
    const daysData: { [key: string]: { date: string; count: number } } = {}
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateString = date.toISOString().split('T')[0]
      daysData[dateString] = { date: dateString, count: 0 }
    }

    // 查询用户在过去7天传输码的使用记录
    const usageStats = await prisma.transferCodeUsage.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true
      }
    })

    // 按日期统计
    usageStats.forEach((usage) => {
      const dateString = usage.createdAt.toISOString().split('T')[0]
      if (daysData[dateString]) {
        daysData[dateString].count++
      }
    })

    // 转换为数组格式
    const result = Object.values(daysData)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('获取传输码使用统计失败:', error)
    return NextResponse.json({ code: 'ServerError', message: '服务器错误' }, { status: 500 })
  }
}
