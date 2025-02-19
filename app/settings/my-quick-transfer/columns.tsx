"use client"

import { ColumnDef, Row } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

export type QuickTransfer = {
  id: string
  name: string
  code: string
  size: string
  downloads: number
  expireAt: string
  createdAt: string
}

export const columns: ColumnDef<QuickTransfer>[] = [
  {
    accessorKey: "name",
    header: "文件名",
  },
  {
    accessorKey: "code",
    header: "传输码",
  },
  {
    accessorKey: "size",
    header: "大小",
  },
  {
    accessorKey: "downloads",
    header: "下载次数",
  },
  {
    accessorKey: "expireAt",
    header: "过期时间",
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
  },
  {
    id: "actions",
    cell: ({ row }: { row: Row<QuickTransfer> }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>复制链接</DropdownMenuItem>
            <DropdownMenuItem>查看详情</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">删除</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 