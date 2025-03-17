'use client'

import { ColumnDef } from '@tanstack/react-table'
import { EditDialog } from './edit-dialog'
import { DetailDialog } from './detail-dialog'
import { TransferCode, ColumnActions } from '@/components/settings/transfer-code-list'
import { createBaseColumns } from '@/components/settings/transfer-code-list/columns'
import { ActionColumn } from '@/components/settings/transfer-code-list/action-column'

// 继续使用UploadCode类型作为别名以保持兼容性
export type UploadCode = TransferCode

export function getColumns(actions: ColumnActions) {
  // 获取基础列
  const baseColumns = createBaseColumns<UploadCode>()

  // 添加操作列
  const actionColumn: ColumnDef<UploadCode> = {
    id: 'actions',
    cell: ({ row }) => (
      <ActionColumn
        row={row}
        actions={actions}
        EditDialogComponent={EditDialog}
        DetailDialogComponent={DetailDialog}
        deleteConfirmMessage="删除后将<b><Shake>无法恢复</Shake></b>，相关的文件及其生成的下载码<b><Shake>不会</Shake></b>被删除。"
      />
    )
  }

  // 返回完整的列配置
  return [...baseColumns, actionColumn]
}
