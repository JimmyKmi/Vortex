'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { TransferCode } from '@/components/settings/transfer-code-list'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { HiddenText } from '@/components/jimmy-ui/hidden-text'

interface DetailDialogProps {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  data: TransferCode
}

export function DetailDialog({ open, onOpenChangeAction, data }: DetailDialogProps) {
  const handleCopyCode = () => {
    void navigator.clipboard.writeText(data.code)
    toast.success('已复制到剪贴板')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>快传码详情</DialogTitle>
          <DialogDescription>查看快传码的详细信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">传输码</div>
            <div className="flex items-center gap-2">
              <div className="bg-muted px-2 py-1 rounded text-lg">
                <HiddenText text={data.code} />
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">描述</div>
            <div className="text-muted-foreground">{data.comment || '无'}</div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">过期时间</div>
            <div className="text-muted-foreground">
              {data.expires ? format(new Date(data.expires), 'yyyy-MM-dd HH:mm') : '永不过期'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">速度限制</div>
            <div className="text-muted-foreground">{data.speedLimit ? `${data.speedLimit / 1024} Mbps` : '不限制'}</div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">使用次数</div>
            <div className="text-muted-foreground">{data.usageLimit ? `${data.usageLimit} 次` : '不限制'}</div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">创建时间</div>
            <div className="text-muted-foreground">{format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm')}</div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChangeAction(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
