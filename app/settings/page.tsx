'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { useSession } from 'next-auth/react'
import { SettingsTitle } from '@/components/settings/settings-title'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { FileClock, FileUp, Code, Calendar, IdCard, ChevronRight, ChevronLeft, MoreHorizontal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HiddenText } from '@/components/jimmy-ui/hidden-text'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// 定义接口
interface ChartData {
  date: string
  count: number
}

interface MostActiveCode {
  id: string
  code: string
  type: string
  comment: string | null
  _count: {
    usages: number
  }
  updatedAt: string
}

interface TransferLog {
  id: string
  userId: string
  transferCodeId: string
  createdAt: string
  ipAddress: string | null
  transferCode: {
    code: string
    type: string
    comment: string | null
  }
}

interface OverviewData {
  totalTransferCodes: number
  totalFiles: number
  totalUsages: number
  recentTransferCodes: number
  mostActiveTransferCodes: MostActiveCode[]
  userInfo: {
    id: string
    createdAt: string
    name: string | null
    email: string | null
    image: string | null
  }
  transferLogs: TransferLog[]
  filesStats: ChartData[]
  transferCodesStats: ChartData[]
  usageStats: ChartData[]
}

// 图表颜色配置
const CHART_COLORS = {
  transferCode: '#F59E0B',
  files: '#10B981',
  usage: '#3B82F6'
}

// 转换日期格式为更友好的显示
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const dateObj = new Date(dateString)
  if (isNaN(dateObj.getTime())) return ''
  return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
}

// 转换传输码类型为中文
const translateTransferType = (type: string) => {
  switch (type) {
    case 'UPLOAD':
      return '上传码'
    case 'DOWNLOAD':
      return '下载码'
    case 'COLLECTION':
      return '采集码'
    default:
      return type
  }
}

// 格式化时间
const formatDateTime = (dateString: string) => {
  if (!dateString) return '未知'
  const dateObj = new Date(dateString)
  if (isNaN(dateObj.getTime())) return '未知'
  return dateObj.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 自定义工具提示格式化函数
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md shadow-md p-2 text-sm">
        <p className="text-foreground font-medium">{`${label}`}</p>
        <p className="text-muted-foreground">{`${payload[0].value} ${payload[0].name === 'usage' ? '次' : '个'}`}</p>
      </div>
    )
  }
  return null
}

// 骨架屏组件
const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* 第一行：基础信息和各种统计图表骨架 */}
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4 mt-6">
      {/* 基础信息骨架 */}
      <Card className="h-full">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 三个统计图表的骨架 */}
      {Array(3)
        .fill(0)
        .map((_, index) => (
          <Card key={index} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-8 w-[70px] mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-[120px] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
    </div>

    {/* 第二行：最活跃传输码表格骨架 */}
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
      {Array(2)
        .fill(0)
        .map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-[150px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex space-x-4 py-2 border-b">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-4 w-[80px]" />
                    ))}
                </div>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex space-x-4 py-2">
                      {Array(4)
                        .fill(0)
                        .map((_, j) => (
                          <Skeleton key={j} className="h-4 w-[80px]" />
                        ))}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>

    {/* 第三行：本账号的传输日志骨架 */}
    <Card className="mt-6">
      <CardHeader>
        <Skeleton className="h-5 w-[150px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex space-x-4 py-2 border-b">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-4 w-[80px]" />
              ))}
          </div>
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex space-x-4 py-2">
                {Array(5)
                  .fill(0)
                  .map((_, j) => (
                    <Skeleton key={j} className="h-4 w-[80px]" />
                  ))}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  </div>
)

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
    } else {
      // 加载数据
      void fetchData()
    }
  }, [session, status, router])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 获取总览数据，修正API路径
      const overviewRes = await fetch('/api/my-dashboard/overview')
      const overviewData = await overviewRes.json()

      if (overviewData.data) {
        // 处理日期格式
        if (overviewData.data.transferCodesStats) {
          overviewData.data.transferCodesStats = overviewData.data.transferCodesStats.map((item: ChartData) => ({
            ...item,
            date: formatDate(item.date)
          }))
        }

        if (overviewData.data.filesStats) {
          overviewData.data.filesStats = overviewData.data.filesStats.map((item: ChartData) => ({
            ...item,
            date: formatDate(item.date)
          }))
        }

        if (overviewData.data.usageStats) {
          overviewData.data.usageStats = overviewData.data.usageStats.map((item: ChartData) => ({
            ...item,
            date: formatDate(item.date),
            name: 'usage'
          }))
        }

        setOverviewData(overviewData.data)
      }
    } catch (error) {
      console.error('获取统计数据失败', error)
    } finally {
      setLoading(false)
    }
  }

  // 将最活跃传输码按类型分组并限制数量
  const getGroupedActiveCodes = (limit = 5) => {
    if (!overviewData?.mostActiveTransferCodes) return { upload: [], download: [] }

    const result = overviewData.mostActiveTransferCodes.reduce(
      (acc, code) => {
        const type = code.type.toLowerCase() as 'upload' | 'download'
        if (type !== 'upload' && type !== 'download') return acc

        if (!acc[type]) acc[type] = []
        acc[type].push(code)
        return acc
      },
      { upload: [], download: [] } as Record<string, MostActiveCode[]>
    )

    // 排序并限制数量
    if (result.upload) {
      result.upload.sort((a, b) => b._count.usages - a._count.usages)
      result.upload = result.upload.slice(0, limit)
    }

    if (result.download) {
      result.download.sort((a, b) => b._count.usages - a._count.usages)
      result.download = result.download.slice(0, limit)
    }

    return result
  }

  const groupedActiveCodes = getGroupedActiveCodes()

  // 用于生成字母头像
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  // 分页处理函数
  const getPaginatedLogs = () => {
    if (!overviewData?.transferLogs) return []

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    return overviewData.transferLogs.slice(startIndex, endIndex)
  }

  const totalPages = overviewData?.transferLogs ? Math.ceil(overviewData.transferLogs.length / itemsPerPage) : 0

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // 生成页码导航
  const getPageNumbers = () => {
    const maxPagesToShow = 5
    const pageNumbers = []

    if (totalPages <= maxPagesToShow) {
      // 如果总页数少于或等于要显示的最大页数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // 计算页码导航的起始和结束
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      // 调整结束页码，确保不超过总页数
      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      // 填充页码数组
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
  }

  return (
    <SettingsLayout title="总览">
      <SettingsTitle title="总览" description="统计信息" />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 第一行：基础信息和各种统计图表 */}
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4 mt-6">
            {/* 基础信息 */}
            <Card className="h-full">
              <CardContent className="pt-6">
                {overviewData?.userInfo && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={overviewData.userInfo.image || ''}
                          alt={overviewData.userInfo.name || '用户'}
                        />
                        <AvatarFallback>
                          {getInitials(overviewData.userInfo.name || overviewData.userInfo.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{overviewData.userInfo.name || '未设置昵称'}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          {overviewData.userInfo.id}
                        </div>
                      </div>
                    </div>

                    {/* TODO 展示最近登录历史 */}
                    <div className="flex items-center">
                      <IdCard className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mr-2">ID:</span>
                      <span>{overviewData.userInfo.email || '未绑定'}</span>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mr-2">注册时间:</span>
                      <span>{new Date(overviewData.userInfo.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快传数量统计图表 */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">快传数量</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{overviewData?.totalTransferCodes || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">近30天趋势图</div>
              </CardHeader>
              <CardContent>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewData?.transferCodesStats || []}>
                      <defs>
                        <linearGradient id="transferCodeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.transferCode} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.transferCode} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bbbbbb" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="快传"
                        stroke={CHART_COLORS.transferCode}
                        fillOpacity={1}
                        fill="url(#transferCodeGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 文件总数统计图表 */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">文件总数</CardTitle>
                  <FileClock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{overviewData?.totalFiles || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">近30天趋势图</div>
              </CardHeader>
              <CardContent>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewData?.filesStats || []}>
                      <defs>
                        <linearGradient id="filesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.files} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.files} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bbbbbb" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="文件"
                        stroke={CHART_COLORS.files}
                        fillOpacity={1}
                        fill="url(#filesGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 使用次数统计图表 */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">使用次数</CardTitle>
                  <FileUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{overviewData?.totalUsages || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">近30天趋势图</div>
              </CardHeader>
              <CardContent>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewData?.usageStats || []}>
                      <defs>
                        <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.usage} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.usage} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bbbbbb" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="usage"
                        stroke={CHART_COLORS.usage}
                        fillOpacity={1}
                        fill="url(#usageGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 第二行：最活跃传输码表格 */}
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
            {/* 最活跃上传码 */}
            <Card>
              <CardHeader>
                <CardTitle>我的上传</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>备注</TableHead>
                      <TableHead>上传码</TableHead>
                      <TableHead>使用次数</TableHead>
                      <TableHead>最近使用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedActiveCodes.upload?.length > 0 ? (
                      groupedActiveCodes.upload.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-medium">{code.comment || '未备注'}</TableCell>
                          <TableCell>
                            <HiddenText text={code.code} />
                          </TableCell>
                          <TableCell>{code._count.usages}</TableCell>
                          <TableCell>{formatDateTime(code.updatedAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {overviewData?.mostActiveTransferCodes &&
                  overviewData.mostActiveTransferCodes.filter((code) => code.type.toLowerCase() === 'upload').length >
                    5 && (
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm" onClick={() => router.push('/settings/my-upload-code')}>
                        查看更多 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* 最活跃下载码 */}
            <Card>
              <CardHeader>
                <CardTitle>活跃的快传</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>备注</TableHead>
                      <TableHead>下载码</TableHead>
                      <TableHead>使用次数</TableHead>
                      <TableHead>最近使用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedActiveCodes.download?.length > 0 ? (
                      groupedActiveCodes.download.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-medium">{code.comment || '未备注'}</TableCell>
                          <TableCell>
                            <HiddenText text={code.code} />
                          </TableCell>
                          <TableCell>{code._count.usages}</TableCell>
                          <TableCell>{formatDateTime(code.updatedAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {overviewData?.mostActiveTransferCodes &&
                  overviewData.mostActiveTransferCodes.filter((code) => code.type.toLowerCase() === 'download').length >
                    5 && (
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm" onClick={() => router.push('/settings/my-quick-transfer')}>
                        查看更多 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* 第三行：本账号的传输日志 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>传输日志</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>传输码备注</TableHead>
                    <TableHead>上传码</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overviewData?.transferLogs && overviewData.transferLogs.length > 0 ? (
                    getPaginatedLogs().map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{translateTransferType(log.transferCode.type)}</TableCell>
                        <TableCell className="font-medium">{log.transferCode.comment || '未备注'}</TableCell>
                        <TableCell>
                          <HiddenText text={log.transferCode.code} />
                        </TableCell>
                        <TableCell>{log.ipAddress || '未知'}</TableCell>
                        <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        暂无传输日志
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {overviewData?.transferLogs && overviewData.transferLogs.length > 0 && (
                <div className="flex items-center justify-end space-x-2 mt-4">
                  <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>

                  {/* 页码导航 */}
                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </SettingsLayout>
  )
}
