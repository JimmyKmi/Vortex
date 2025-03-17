'use client'

import { ColumnDef } from '@tanstack/react-table'
import { EditDialog } from './edit-dialog'
import { DetailDialog } from './detail-dialog'
import { TransferCode, ColumnActions } from '@/components/settings/transfer-code-list'
import { createBaseColumns } from '@/components/settings/transfer-code-list/columns'
import { ActionColumn } from '@/components/settings/transfer-code-list/action-column'

export function getColumns(actions: ColumnActions) {
  // 获取基础列
  const baseColumns = createBaseColumns<TransferCode>()

  // 添加操作列
  const actionColumn: ColumnDef<TransferCode> = {
    id: 'actions',
    cell: ({ row }) => (
      <ActionColumn
        row={row}
        actions={actions}
        EditDialogComponent={EditDialog}
        DetailDialogComponent={DetailDialog}
        deleteConfirmMessage="删除后将无法恢复，相关的文件记录也会被删除。"
      />
    )
  }

  // 返回完整的列配置
  return [...baseColumns, actionColumn]
}
