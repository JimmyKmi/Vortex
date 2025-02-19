"use client"

import {useEffect, useState} from "react"
import {DataTable} from "@/components/ui/data-table"
import {getColumns, type TransferCode} from "./columns"
import {SettingsLayout} from '@/components/settings/settings-layout'
import {SettingsTitle} from '@/components/settings/settings-title'
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

export default function MyQuickTransferPage() {
  // 状态管理
  const [data, setData] = useState<TransferCode[]>([]) // 存储下载码数据
  const [loading, setLoading] = useState(true) // 加载状态
  const [selectedRows, setSelectedRows] = useState<TransferCode[]>([]) // 选中的行
  const [isDeleting, setIsDeleting] = useState(false) // 删除状态
  const [isDisabling, setIsDisabling] = useState(false) // 禁用状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false) // 删除对话框状态
  const [searchQuery, setSearchQuery] = useState("")

  // 获取下载码数据
  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/transfer-codes?type=DOWNLOAD")
      if (response.data.code === "Success") setData(response.data.data)
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
      await axios.delete("/api/transfer-codes/batch", {
        data: {
          ids: selectedRows.map(row => row.id)
        }
      })
      toast.success("批量删除成功")
      await fetchData()
      setDeleteDialogOpen(false)
    } catch (error: any) {
      toast.error("批量删除失败", {description: getApiErrorMessage(error)})
    } finally {
      setIsDeleting(false)
    }
  }

  // 批量禁用处理
  const handleBatchDisable = async () => {
    try {
      setIsDisabling(true)
      await axios.put("/api/transfer-codes/batch", {
        ids: selectedRows.map(row => row.id),
        action: "disable"
      })
      toast.success("批量禁用成功")
      await fetchData()
    } catch (error: any) {
      toast.error("批量禁用失败", {description: getApiErrorMessage(error)})
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
    <SettingsLayout title="我的快传">
      <SettingsTitle
        title="我的快传"
        description="管理您的快传码，查看已分享的文件"
      >
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting || isDisabling}
              >
                {isDeleting ? "删除中..." : "批量删除"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleBatchDisable}
                disabled={isDeleting || isDisabling}
              >
                {isDisabling ? "禁用中..." : "批量禁用"}
              </Button>
            </>
          )}
        </div>
      </SettingsTitle>

      <div>
        <Input
          placeholder="搜索传输码或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
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