"use client"

import { getColumns } from "./columns"
import { TransferCodeList } from "@/components/settings/transfer-code-list"

export default function MyQuickTransferPage() {
  return (
    <TransferCodeList
      type="DOWNLOAD"
      title="我的快传"
      description="管理您的快传码，查看已分享的文件"
      getColumnsAction={getColumns}
    />
  )
} 