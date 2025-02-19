"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { getColumns, type UploadCode } from "./columns"
import { SettingsLayout } from '@/components/settings/settings-layout'
import { SettingsTitle } from '@/components/settings/settings-title'
import { CreateDialog } from "./create-dialog"
import { Button } from "@/components/ui/button"
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
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/utils/error-messages"

export default function MyUploadCodePage() {
  const [data, setData] = useState<UploadCode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<UploadCode[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/transfer-codes")
      if (response.data.code === "Success") {
        setData(response.data.data)
      }
    } catch (error) {
      console.error("Failed to fetch transfer codes:", error)
      toast.error("获取数据失败", {
        description: getApiErrorMessage(error)
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

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
      toast.error("批量删除失败", {
        description: getApiErrorMessage(error)
      })
    } finally {
      setIsDeleting(false)
    }
  }

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
      toast.error("批量禁用失败", {
        description: getApiErrorMessage(error)
      })
    } finally {
      setIsDisabling(false)
    }
  }

  const columns = getColumns({
    onRefresh: fetchData,
  })

  return (
    <SettingsLayout title="我的上传码">
      <SettingsTitle
        title="我的上传码"
        description="创建和管理您的上传码，用于收集他人上传的文件"
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
          <CreateDialog onSuccess={fetchData} />
        </div>
      </SettingsTitle>

      <DataTable 
        columns={columns} 
        data={data}
        onRowSelectionChange={setSelectedRows}
      />

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