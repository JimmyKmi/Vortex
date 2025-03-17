'use client'

import { ColumnDef, Row } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { TransferCode } from './types'

// 创建基础列定义，这部分在不同的传输码类型之间是共享的
export function createBaseColumns<T extends TransferCode>() {
  const columns: ColumnDef<T>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      ),
      enableSorting: false
    },
    {
      accessorKey: 'code',
      header: '传输码',
      cell: ({ row }) => {
        const code = row.getValue('code') as string
        return (
          <Button
            variant="ghost"
            className="p-0 font-mono hover:bg-transparent hover:underline"
            onClick={() => {
              void navigator.clipboard.writeText(code)
              return import('sonner').then(({ toast }) => {
                toast.success('已复制到剪贴板')
              })
            }}
          >
            {code}
          </Button>
        )
      }
    },
    {
      accessorKey: 'comment',
      header: '描述'
    },
    {
      accessorKey: 'disableReason',
      header: ({ column }) => {
        return (
          <div className="-mx-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                const currentSort = column.getIsSorted()
                if (currentSort === false) {
                  column.toggleSorting(true)
                } else if (currentSort === 'desc') {
                  column.toggleSorting(false)
                } else {
                  column.clearSorting()
                }
              }}
            >
              状态
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
      cell: ({ row }: { row: Row<T> }) => {
        const disableReason = row.getValue('disableReason') as string | null
        const expires = row.original.expires as Date | null

        let status = 'active'
        let label = '有效'

        if (disableReason) {
          status = 'disabled'
          label = disableReason === 'USER' ? '已禁用' : '已达到限制'
        } else if (expires && new Date(expires) < new Date()) {
          status = 'expired'
          label = '已过期'
        }

        return <Badge variant={status === 'active' ? 'default' : 'secondary'}>{label}</Badge>
      }
    },
    {
      accessorKey: 'expires',
      header: ({ column }) => {
        return (
          <div className="-mx-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                const currentSort = column.getIsSorted()
                if (currentSort === false) {
                  column.toggleSorting(true)
                } else if (currentSort === 'desc') {
                  column.toggleSorting(false)
                } else {
                  column.clearSorting()
                }
              }}
            >
              过期时间
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const expires = row.getValue('expires') as Date | null
        return expires ? format(new Date(expires), 'yyyy-MM-dd HH:mm') : '永不过期'
      }
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <div className="-mx-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                const currentSort = column.getIsSorted()
                if (currentSort === false) {
                  column.toggleSorting(true)
                } else if (currentSort === 'desc') {
                  column.toggleSorting(false)
                } else {
                  column.clearSorting()
                }
              }}
            >
              创建时间
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return format(new Date(row.getValue('createdAt')), 'yyyy-MM-dd HH:mm')
      }
    }
  ]

  return columns
}
