"use client"

import { useRef } from "react"
import { getColumns } from "./columns"
import { TransferCodeList, RefreshCallback } from "@/components/settings/transfer-code-list"
import { CreateDialog } from "./create-dialog"

export default function MyUploadCodePage() {
  const refreshRef = useRef<RefreshCallback>()
  
  return (
    <TransferCodeList
      type="UPLOAD"
      title="我的上传码"
      description="创建和管理您的上传码，使用上传码上传文件后会自动创建对应文件下载用的快传码"
      getColumnsAction={getColumns}
      extraActions={<CreateDialog onSuccess={() => refreshRef.current?.()} />}
      onRefreshRef={refreshRef}
    />
  )
} 