'use client'

import { useState } from 'react'
import { Row } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import axios from 'axios'
import { TransferCode, ColumnActions } from './types'

interface DialogComponentProps {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  data: TransferCode
  onSuccess?: () => void
}

export interface ActionColumnProps<T extends TransferCode> {
  row: Row<T>
  actions: ColumnActions
  EditDialogComponent?: React.ComponentType<DialogComponentProps>
  DetailDialogComponent?: React.ComponentType<DialogComponentProps>
  deleteConfirmMessage?: string
}

export function ActionColumn<T extends TransferCode>({
  row,
  actions,
  EditDialogComponent,
  DetailDialogComponent,
  deleteConfirmMessage = '删除后将无法恢复，相关的文件记录也会被删除。'
}: ActionColumnProps<T>) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isDisabled =
    !!row.original.disableReason ||
    !!(row.original.expires && new Date(row.original.expires) < new Date())
  const isExpired =
    !row.original.disableReason &&
    !!(row.original.expires && new Date(row.original.expires) < new Date())

  const handleToggleStatus = async () => {
    try {
      setIsLoading(true)
      await axios.put(`/api/transfer-codes/${row.original.id}`)
      toast.success(isDisabled ? '已启用' : '已禁用')
      actions.onRefresh?.()
    } catch (error: any) {
      toast.error(isDisabled ? '启用失败' : '禁用失败', {
        description: error.response?.data?.message || '请重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await axios.delete(`/api/transfer-codes/${row.original.id}`)
      toast.success('删除成功')
      actions.onRefresh?.()
    } catch (error: any) {
      toast.error('删除失败', {
        description: error.response?.data?.message || '请重试'
      })
    } finally {
      setIsLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
            <span className="sr-only">打开菜单</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {DetailDialogComponent && (
            <DropdownMenuItem onClick={() => setDetailDialogOpen(true)}>查看详情</DropdownMenuItem>
          )}
          {EditDialogComponent && (
            <DropdownMenuItem disabled={isDisabled} onClick={() => setEditDialogOpen(true)}>
              编辑
            </DropdownMenuItem>
          )}
          {!isExpired && (
            <DropdownMenuItem
              onClick={handleToggleStatus}
              className={isDisabled ? undefined : 'text-destructive focus:text-destructive'}
            >
              {isDisabled ? '启用' : '禁用'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {DetailDialogComponent && (
        <DetailDialogComponent
          open={detailDialogOpen}
          onOpenChangeAction={setDetailDialogOpen}
          data={row.original}
        />
      )}

      {EditDialogComponent && (
        <EditDialogComponent
          open={editDialogOpen}
          onOpenChangeAction={setEditDialogOpen}
          data={row.original}
          onSuccess={actions.onRefresh}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除传输码？</AlertDialogTitle>
            <AlertDialogDescription>{deleteConfirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
