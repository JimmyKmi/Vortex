"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/layout"
import { Title } from "@/components/title"
import { Button } from "@/components/ui/button"
import { Copy, Clock } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import { useTransferSession } from "@/hooks/useTransferSession"
import { getApiErrorMessage } from "@/lib/utils/error-messages"
import { TransferInfo } from "@/types/transfer-session"

export default function DownloadPage({ params }: { params: { params: string } }) {
  const [isValidating, setIsValidating] = useState(true)
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const router = useRouter()
  const sessionId = params.params

  // 获取传输码详细信息
  const fetchTransferInfo = async () => {
    try {
      setIsValidating(true)
      const response = await axios.get(`/api/transfer-sessions/${sessionId}/info`)
      
      if (response.data.code === "Success") {
        setTransferInfo(response.data.data)
      } else {
        toast.error(getApiErrorMessage(response.data))
        router.push("/")
      }
    } catch (error: any) {
      console.error("Get transfer info error:", error)
      toast.error(getApiErrorMessage(error))
      router.push("/")
    } finally {
      setIsValidating(false)
    }
  }

  // 使用会话管理 Hook
  const { isActive, cleanup } = useTransferSession({
    sessionId
  })

  // 获取传输码信息
  useEffect(() => {
    if (sessionId) {
      void fetchTransferInfo()
    }
  }, [sessionId])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(transferInfo?.code || "")
      setIsCopied(true)
      toast.success("传输码已复制到剪贴板")
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error("复制失败，请手动复制")
    }
  }

  // 下载完成后清理会话
  const handleDownloadComplete = useCallback(() => {
    cleanup()
  }, [cleanup])

  if (isValidating) {
    return (
      <Layout width="middle">
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">正在验证会话...</p>
        </div>
      </Layout>
    )
  }

  if (!transferInfo) {
    return null
  }

  return (
    <Layout width="middle">
      <div className="space-y-4">
        <Title buttonType="back" title="文件下载"/>
        
        <div className="bg-muted p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">传输信息</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="text-sm text-muted-foreground hover:text-foreground p-0 flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                {isCopied ? "复制成功" : "点击此处复制传输码"}
              </Button>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between sm:pr-4">
                <span className="text-muted-foreground">创建者</span>
                <span>{transferInfo.createdBy || "未知"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span>{new Date(transferInfo.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between sm:pr-4">
                <span className="text-muted-foreground">使用限制</span>
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
                <div className="pt-2 border-t col-span-2">
                  <p className="text-muted-foreground">描述信息：</p>
                  <p className="mt-1">{transferInfo.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 这里添加文件下载相关的UI组件 */}
        <div className="text-center text-muted-foreground">
          文件下载功能开发中...
        </div>
      </div>
    </Layout>
  )
} 