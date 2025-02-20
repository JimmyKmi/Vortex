"use client"

import {useEffect, useState} from "react"
import {DataTable} from "@/components/ui/data-table"
import {getColumns, type UploadCode} from "./columns"
import {SettingsLayout} from '@/components/settings/settings-layout'
import {SettingsTitle} from '@/components/settings/settings-title'
import {CreateDialog} from "./create-dialog"
import {Button} from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import axios from "axios"
import {toast} from "sonner"
import {getApiErrorMessage} from "@/lib/utils/error-messages"
import {Skeleton} from "@/components/ui/skeleton"
import {Input} from "@/components/ui/input"
import { Trash2, CircleOff, RefreshCw } from "lucide-react"

export default function MyUploadCodePage() {
  // 状态管理
  const [data, setData] = useState<UploadCode[]>([]) // 存储上传码数据
  const [loading, setLoading] = useState(true) // 加载状态
  const [selectedRows, setSelectedRows] = useState<UploadCode[]>([]) // 选中的行
  const [isDeleting, setIsDeleting] = useState(false) // 删除状态
  const [isDisabling, setIsDisabling] = useState(false) // 禁用状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false) // 删除对话框状态
  const [searchQuery, setSearchQuery] = useState("")

  // 获取上传码数据
  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/transfer-codes?type=UPLOAD")
      if (response.data.code === "Success") {
        setData(response.data.data)
        setSelectedRows([]) // 重置选中状态
      }
    } catch (error) {
      console.error("Failed to fetch transfer codes:", error)
      toast.error("获取数据失败", {description: getApiErrorMessage(error)})
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {void fetchData()}, [])

  // 批量删除处理
  const handleBatchDelete = async () => {
    try {
      setIsDeleting(true)
      console.log('Selected rows:', selectedRows)
      await axios.delete("/api/transfer-codes", {
        data: {
          ids: selectedRows.map(row => row.id)
        }
      })
      toast.success("批量删除成功")
      await fetchData()
      setDeleteDialogOpen(false)
    } catch (error: any) {
      console.error('Batch delete error:', error.response?.data)
      toast.error("批量删除失败", {description: getApiErrorMessage(error)})
    } finally {
      setIsDeleting(false)
    }
  }

  // 批量禁用处理
  const handleBatchDisable = async () => {
    try {
      setIsDisabling(true)
      console.log('Selected rows:', selectedRows)
      await axios.put("/api/transfer-codes", {
        ids: selectedRows.map(row => row.id),
        action: "disable"
      })
      toast.success("批量禁用成功")
      await fetchData()
    } catch (error: any) {
      console.error('Batch disable error:', error.response?.data)
      toast.error("批量禁用失败", {description: getApiErrorMessage(error)})
    } finally {
      setIsDisabling(false)
    }
  }

  // 批量启用处理
  const handleBatchEnable = async () => {
    try {
      setIsDisabling(true)
      await axios.put("/api/transfer-codes", {
        ids: selectedRows.map(row => row.id),
        action: "enable"
      })
      toast.success("批量启用成功")
      await fetchData()
    } catch (error: any) {
      toast.error("批量启用失败", {description: getApiErrorMessage(error)})
    } finally {
      setIsDisabling(false)
    }
  }

  // 获取表格列配置
  const columns = getColumns({onRefresh: fetchData,})

  // 过滤数据
  const filteredData = data.filter(item => 
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.comment && item.comment.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <SettingsLayout title="我的上传码">
      <SettingsTitle
        title="我的上传码"
        description="创建和管理您的上传码，使用上传码上传文件后会自动创建对应文件下载用的快传码"
      >
        <CreateDialog onSuccess={fetchData}/>
      </SettingsTitle>

      <div className="flex items-center gap-2">
        <Input
          placeholder="搜索传输码或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchData}
          disabled={loading}
          className="text-yellow-700 dark:text-yellow-500 hover:text-yellow-600 ml-3"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        {selectedRows.length > 0 && (
          <>
            <Button
              variant="ghost"
              onClick={handleBatchDisable}
              disabled={isDeleting || isDisabling}
              size="sm"
            >
              <CircleOff className="h-4 w-4" />
              禁用
            </Button>
            <Button
              variant="ghost"
              onClick={handleBatchEnable}
              disabled={isDeleting || isDisabling}
              size="sm"
            >
              <CircleOff className="h-4 w-4" />
              启用
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting || isDisabling}
              size="icon"
              className="text-destructive hover:text-destructive dark:text-red-500 dark:hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full"/>
          <Skeleton className="h-12 w-full"/>
          <Skeleton className="h-12 w-full"/>
          <Skeleton className="h-12 w-full"/>
          <Skeleton className="h-12 w-full"/>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          onRowSelectionChange={setSelectedRows}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除传输码？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 {selectedRows.length} 个传输码，删除后将无法恢复，相关的文件记录也会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  )
} 