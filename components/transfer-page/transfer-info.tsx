import React, {useState} from 'react'
import {Button} from "@/components/ui/button"
import {
  User,
  Calendar,
  Hash,
  Clock,
  Copy
} from 'lucide-react'
import {toast} from "sonner"
import {TransferInfo as TransferInfoType} from "@/types/transfer-session"

interface TransferInfoProps {
  transferInfo: TransferInfoType;
  className?: string;
}

export function TransferInfo({transferInfo, className}: TransferInfoProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(transferInfo?.code || '')
      setIsCopied(true)
      toast.success("传输码已复制到剪贴板")
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error("复制失败，请手动复制")
    }
  }

  return (
    <div className={`bg-muted p-4 pt-2 rounded-lg ${className || ''}`}>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">传输信息</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="text-sm text-muted-foreground hover:text-foreground p-0 flex items-center gap-1"
          >
            <Copy className="h-4 w-4"/>
            {isCopied ? "复制成功" : "复制传输码"}
          </Button>
        </div>
        <div className="grid gap-y-2 gap-x-5 text-sm grid-cols-1 sm:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-4 w-4"/>
              创建者
            </span>
            <span>{transferInfo.createdBy || "未知"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4"/>
              创建时间
            </span>
            <span>{new Date(transferInfo.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Hash className="h-4 w-4"/>
              使用限制
            </span>
            <span>{transferInfo.usageLimit ? `${transferInfo.usageLimit}次` : "不限"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4"/>
              剩余次数
            </span>
            <span>
              {transferInfo.usageLimit
                ? `${transferInfo.usageLimit - (transferInfo.usedCount || 0)}次`
                : "不限"}
            </span>
          </div>
          {transferInfo.comment && (
            <div className="pt-4 mt-2 border-t border-neutral-400/50 col-span-1 sm:col-span-2">
              <p className="text-muted-foreground">描述信息：</p>
              <p className="mt-1">{transferInfo.comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 