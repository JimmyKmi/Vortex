/**
 * 文件上传完成页面组件
 * 显示上传成功信息和下载码，提供复制和返回首页功能
 */

'use client'

import {useRouter} from 'next/navigation'
import {Button} from "@/components/ui/button"
import {Check, Copy} from "lucide-react"
import {toast} from "sonner"
import {useState} from "react"
import Layout from '@/components/layout'
import {Title} from "@/components/title"
import {TransferInfo} from "@/types/transfer-session"

/**
 * 上传完成页面组件
 * @param {Object} props - 组件属性
 * @param {TransferInfo} props.transferInfo - 传输信息对象
 */
export default function UploadComplete({transferInfo}: { transferInfo: TransferInfo }) {
  const router = useRouter()
  const [isCopied, setIsCopied] = useState(false)

  /**
   * 处理复制下载码到剪贴板
   * 复制成功后显示提示，并在2秒后重置复制状态
   */
  const handleCopyCode = async () => {
    if (!transferInfo.downloadCode) return
    try {
      await navigator.clipboard.writeText(transferInfo.downloadCode)
      setIsCopied(true)
      toast.success("下载码已复制到剪贴板")
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error("复制失败，请手动复制")
    }
  }

  return (
    <Layout width="min">
      <div className="space-y-4">
        <Title buttonType="back" title="上传完成"/>

        {/* 上传成功信息展示区域 */}
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-4">
            {/* 成功图标 */}
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600"/>
              </div>
            </div>
            {/* 成功提示信息 */}
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">上传成功！</h2>
            </div>
            {/* 下载码显示和复制按钮 */}
            <div className="text-center">
              <span className="text-2xl font-mono">{transferInfo.downloadCode}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {isCopied ? (<Check className="h-4 w-4"/>) : (<Copy className="h-4 w-4"/>)}
              </Button>
              <p className="text-muted-foreground mt-2">您的下载码已生成，请妥善保管</p>
            </div>
          </div>

          {/* 底部按钮区域 */}
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => router.push("/")}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
} 