"use client"

import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UploadCode } from "./columns"
import { Badge } from "@/components/ui/badge"

interface DetailDialogProps {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  data: UploadCode
}

export function DetailDialog({ open, onOpenChangeAction, data }: DetailDialogProps) {
  const getStatusInfo = () => {
    if (data.disableReason) {
      return {
        status: "disabled",
        label: data.disableReason === "USER" ? "已禁用" : "已达到限制"
      }
    }
    if (data.expires && new Date(data.expires) < new Date()) {
      return {
        status: "expired",
        label: "已过期"
      }
    }
    return {
      status: "active",
      label: "有效"
    }
  }

  const { status, label } = getStatusInfo()
  const typeMap = {
    UPLOAD: "上传",
    COLLECTION: "采集",
    DOWNLOAD: "下载"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>传输码详情</DialogTitle>
          <DialogDescription>
            查看传输码的详细信息
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div className="text-muted-foreground">传输码</div>
            <div className="font-mono">{data.code}</div>
            
            <div className="text-muted-foreground">类型</div>
            <div>{typeMap[data.type]}</div>
            
            <div className="text-muted-foreground">状态</div>
            <div>
              <Badge variant={status === "active" ? "default" : "secondary"}>
                {label}
              </Badge>
            </div>
            
            <div className="text-muted-foreground">描述</div>
            <div>{data.comment || "-"}</div>
            
            <div className="text-muted-foreground">过期时间</div>
            <div>
              {data.expires 
                ? format(new Date(data.expires), 'yyyy-MM-dd HH:mm')
                : "永不过期"
              }
            </div>
            
            <div className="text-muted-foreground">速度限制</div>
            <div>
              {data.speedLimit 
                ? `${data.speedLimit} KB/s`
                : "不限制"
              }
            </div>
            
            <div className="text-muted-foreground">使用次数</div>
            <div>
              {data.usageLimit 
                ? `${data.usageLimit} 次`
                : "不限制"
              }
            </div>
            
            <div className="text-muted-foreground">创建时间</div>
            <div>{format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm:ss')}</div>
            
            <div className="text-muted-foreground">更新时间</div>
            <div>{format(new Date(data.updatedAt), 'yyyy-MM-dd HH:mm:ss')}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChangeAction(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 