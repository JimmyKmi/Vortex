"use client"

import { useState } from "react"
import { ColumnDef, Row } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { format } from "date-fns"
import { EditDialog } from "./edit-dialog"
import { DetailDialog } from "./detail-dialog"
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
import { toast } from "sonner"
import axios from "axios"
import { Checkbox } from "@/components/ui/checkbox"

export type TransferCode = {
  id: string
  code: string
  comment: string
  type: "UPLOAD" | "COLLECTION" | "DOWNLOAD"
  disableReason: string | null
  expires: Date | null
  speedLimit: number | null
  usageLimit: number | null
  createdAt: Date
  updatedAt: Date
}

interface ColumnActions {
  onRefresh?: () => void
}

export function getColumns(actions: ColumnActions) {
  const columns: ColumnDef<TransferCode>[] = [
    {
      id: "select",
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
      enableSorting: false,
    },
    {
      accessorKey: "code",
      header: "传输码",
      cell: ({ row }) => {
        const code = row.getValue("code") as string
        return (
          <Button
            variant="ghost"
            className="p-0 font-mono hover:bg-transparent hover:underline"
            onClick={() => {
              void navigator.clipboard.writeText(code)
              toast.success("已复制到剪贴板")
            }}
          >
            {code}
          </Button>
        )
      }
    },
    {
      accessorKey: "comment",
      header: "描述",
    },
    {
      accessorKey: "disableReason",
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
                } else if (currentSort === "desc") {
                  column.toggleSorting(false)
                } else {
                  column.clearSorting()
                }
              }}
            >
              状态
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
      cell: ({ row }: { row: Row<TransferCode> }) => {
        const disableReason = row.getValue("disableReason") as string | null
        const expires = row.original.expires as Date | null
        
        let status = "active"
        let label = "有效"
        
        if (disableReason) {
          status = "disabled"
          label = disableReason === "USER" ? "已禁用" : "已达到限制"
        } else if (expires && new Date(expires) < new Date()) {
          status = "expired"
          label = "已过期"
        }

        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "expires",
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
                } else if (currentSort === "desc") {
                  column.toggleSorting(false)
                } else {
                  column.clearSorting()
                }
              }}
            >
              过期时间
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const expires = row.getValue("expires") as Date | null
        return expires ? format(new Date(expires), 'yyyy-MM-dd HH:mm') : '永不过期'
      }
    },
    {
      accessorKey: "createdAt",
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
                } else if (currentSort === "desc") {
                  column.toggleSorting(false)
                } else {
                  column.clearSorting()
                }
              }}
            >
              创建时间
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return format(new Date(row.getValue("createdAt")), 'yyyy-MM-dd HH:mm')
      }
    },
    {
      id: "actions",
      cell: ({ row }: { row: Row<TransferCode> }) => {
        const [editDialogOpen, setEditDialogOpen] = useState(false)
        const [detailDialogOpen, setDetailDialogOpen] = useState(false)
        const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
        const [isLoading, setIsLoading] = useState(false)

        const isDisabled = !!row.original.disableReason || 
          !!(row.original.expires && new Date(row.original.expires) < new Date())
        const isExpired = !row.original.disableReason && 
          !!(row.original.expires && new Date(row.original.expires) < new Date())

        const handleToggleStatus = async () => {
          try {
            setIsLoading(true)
            await axios.put(`/api/transfer-codes/${row.original.id}`)
            toast.success(isDisabled ? "已启用" : "已禁用")
            actions.onRefresh?.()
          } catch (error: any) {
            toast.error(isDisabled ? "启用失败" : "禁用失败", {
              description: error.response?.data?.message || "请重试",
            })
          } finally {
            setIsLoading(false)
          }
        }

        const handleDelete = async () => {
          try {
            setIsLoading(true)
            await axios.delete(`/api/transfer-codes/${row.original.id}`)
            toast.success("删除成功")
            actions.onRefresh?.()
          } catch (error: any) {
            toast.error("删除失败", {
              description: error.response?.data?.message || "请重试",
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
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">打开菜单</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailDialogOpen(true)}>
                  查看详情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggleStatus}
                  disabled={isLoading || isExpired}
                >
                  {isDisabled ? "启用" : "禁用"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                  disabled={isLoading}
                >
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <EditDialog
              open={editDialogOpen}
              onOpenChangeAction={setEditDialogOpen}
              data={row.original}
              onSuccessAction={actions.onRefresh}
            />

            <DetailDialog
              open={detailDialogOpen}
              onOpenChangeAction={setDetailDialogOpen}
              data={row.original}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除传输码？</AlertDialogTitle>
                  <AlertDialogDescription>
                    删除后将无法恢复，相关的文件记录也会被删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isLoading ? "删除中..." : "删除"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )
      },
    },
  ]

  return columns
} 