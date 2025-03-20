import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ResponseThrow } from '@/lib/utils/response'
import logger from '@/lib/utils/logger'

// 获取用户总览信息
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return ResponseThrow('Unauthorized')

    const userId = session.user.id

    // 统计用户创建的传输码总数
    const totalTransferCodes = await prisma.transferCode.count({
      where: { userId }
    })

    // 统计用户创建的文件总数（通过传输码关联的文件）
    const userFiles = await prisma.fileToTransferCode.findMany({
      where: {
        transferCode: {
          userId
        }
      },
      select: {
        fileId: true
      },
      distinct: ['fileId']
    })

    const totalFiles = userFiles.length

    // 统计用户的传输码使用次数
    const totalUsages = await prisma.transferCodeUsage.count({
      where: { userId }
    })

    // 统计最近一周内创建的传输码数量
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const recentTransferCodes = await prisma.transferCode.count({
      where: {
        userId,
        createdAt: {
          gte: oneWeekAgo
        }
      }
    })

    // 统计传输码类型分布
    const transferCodeTypes = await prisma.transferCode.groupBy({
      by: ['type'],
      where: { userId },
      _count: true
    })

    // 格式化传输码类型数据
    const typeDistribution = transferCodeTypes.map((item) => ({
      type: item.type,
      count: item._count
    }))

    // 最活跃的传输码（使用次数最多的）
    const mostActiveTransferCodes = await prisma.transferCode.findMany({
      where: { userId },
      select: {
        id: true,
        code: true,
        type: true,
        comment: true,
        updatedAt: true,
        _count: {
          select: {
            usages: true
          }
        }
      },
      orderBy: {
        usages: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // 获取用户的传输日志
    const transferLogs = await prisma.transferCodeUsage.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        transferCodeId: true,
        createdAt: true,
        transferCode: {
          select: {
            code: true,
            type: true,
            comment: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    // 获取过去30天的统计数据，用于图表
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 生成过去30天的日期列表
    const dateList = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    // 为图表准备数据
    dateList.map((date) => date.toISOString().split('T')[0])
    // 统计每天的传输码创建数量
    const transferCodesStats = await Promise.all(
      dateList.map(async (date) => {
        const nextDay = new Date(date)
        nextDay.setDate(date.getDate() + 1)

        const count = await prisma.transferCode.count({
          where: {
            userId,
            createdAt: {
              gte: date,
              lt: nextDay
            }
          }
        })

        return { date: date.toISOString(), count }
      })
    )

    // 统计每天的文件数量
    const filesStats = await Promise.all(
      dateList.map(async (date) => {
        const nextDay = new Date(date)
        nextDay.setDate(date.getDate() + 1)

        const files = await prisma.fileToTransferCode.findMany({
          where: {
            transferCode: {
              userId,
              createdAt: {
                gte: date,
                lt: nextDay
              }
            }
          },
          select: {
            fileId: true
          },
          distinct: ['fileId']
        })

        return { date: date.toISOString(), count: files.length }
      })
    )

    // 统计每天的使用次数
    const usageStats = await Promise.all(
      dateList.map(async (date) => {
        const nextDay = new Date(date)
        nextDay.setDate(date.getDate() + 1)

        const count = await prisma.transferCodeUsage.count({
          where: {
            userId,
            createdAt: {
              gte: date,
              lt: nextDay
            }
          }
        })

        return { date: date.toISOString(), count }
      })
    )

    // 用户注册时间
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        name: true,
        email: true,
        image: true
      }
    })

    return NextResponse.json({
      data: {
        totalTransferCodes,
        totalFiles,
        totalUsages,
        recentTransferCodes,
        typeDistribution,
        mostActiveTransferCodes,
        userInfo,
        transferLogs,
        filesStats,
        transferCodesStats,
        usageStats
      }
    })
  } catch (error) {
    logger.error('获取用户总览统计失败:', error)
    return NextResponse.json({ code: 'ServerError', message: '服务器错误' }, { status: 500 })
  }
}
