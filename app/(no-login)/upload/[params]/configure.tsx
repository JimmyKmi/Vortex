/**
 * 文件上传配置页面组件
 * 用于配置下载码的相关设置，如使用次数限制、过期时间等
 * 配置完成后可以生成最终下载码
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'
import Layout from '@/components/layout'
import { getApiErrorMessage } from '@/lib/utils/error-messages'
import { TransferSessionStatus } from '@/types/transfer-session'

/**
 * 传输信息接口定义
 * @interface TransferInfo
 */
interface TransferInfo {
  id: string // 传输会话ID
  code: string // 传输码
  type: string // 传输类型
  comment: string | null // 传输说明
  expires: string | null // 过期时间
  createdAt: string // 创建时间
  createdBy: string | null // 创建者
  usageLimit: number | null // 使用次数限制
  downloadCode: string | null // 下载码
  status: TransferSessionStatus // 会话状态
}

/**
 * 上传配置页面组件
 * @param {Object} props - 组件属性
 * @param {TransferInfo} props.transferInfo - 初始传输信息对象
 * @param {(info: TransferInfo) => void} props.onStatusChangeAction - 状态变更回调函数
 */
export default function UploadConfigure({
  transferInfo: initialTransferInfo,
  onStatusChangeAction
}: {
  transferInfo: TransferInfo
  onStatusChangeAction: (info: TransferInfo) => void
}) {
  const params = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [transferInfo, setTransferInfo] = useState(initialTransferInfo)

  // 下载码设置状态
  const [settings, setSettings] = useState({
    usageLimit: '', // 使用次数限制
    comment: '', // 描述信息
    expires: '', // 过期时间
    speedLimit: '' // 速度限制
  })
  const [isCopied, setIsCopied] = useState(false)

  /**
   * 处理设置提交
   * 更新下载码设置并完成配置
   */
  const handleSubmit = async () => {
    const sessionId = params?.params as string
    if (!sessionId) return

    try {
      setIsLoading(true)
      // 更新下载码设置并完成配置
      const response = await axios.patch(`/api/transfer-sessions/${sessionId}/config`, {
        usageLimit: settings.usageLimit ? parseInt(settings.usageLimit) : null,
        comment: settings.comment || null,
        expires: settings.expires || null,
        speedLimit: settings.speedLimit ? parseInt(settings.speedLimit) : null
      })

      if (response.data.code === 'Success') {
        toast.success('设置保存成功！')
        // 更新本地状态
        const updatedInfo: TransferInfo = {
          ...transferInfo,
          status: 'COMPLETED' as TransferSessionStatus,
          usageLimit: settings.usageLimit ? parseInt(settings.usageLimit) : null,
          comment: settings.comment || null,
          expires: settings.expires || null
        }
        setTransferInfo(updatedInfo)
        // 通知父组件状态已更新
        onStatusChangeAction(updatedInfo)
      } else {
        toast.error('更新下载码设置失败：' + getApiErrorMessage(response.data))
      }
    } catch (error: any) {
      toast.error('更新下载码设置失败：' + getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 处理复制下载码到剪贴板
   * 复制成功后显示提示，并在2秒后重置复制状态
   */
  const handleCopyCode = async () => {
    if (!transferInfo.downloadCode) return
    try {
      await navigator.clipboard.writeText(transferInfo.downloadCode)
      setIsCopied(true)
      toast.success('下载码已复制到剪贴板')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (_err) {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <Layout width="min" title="下载码设置" buttonType="back">
      <div className="space-y-4">
        {/* 下载码显示区域 */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-xl font-mono">{transferInfo.downloadCode}</span>
          <Button variant="ghost" size="icon" onClick={handleCopyCode} className="shrink-0">
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* 设置表单区域 */}
        <div className="space-y-4">
          {/* 使用次数限制设置 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="usageLimit" className="text-right">
              使用次数
            </Label>
            <Input
              id="usageLimit"
              type="number"
              className="col-span-3"
              placeholder="留空表示不限制"
              value={settings.usageLimit}
              onChange={(e) => setSettings((prev) => ({ ...prev, usageLimit: e.target.value }))}
            />
          </div>
          {/* 速度限制设置 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speedLimit" className="text-right">
              速度限制
            </Label>
            <Input
              id="speedLimit"
              type="number"
              className="col-span-3"
              placeholder="KB/s，留空表示不限制"
              value={settings.speedLimit}
              onChange={(e) => setSettings((prev) => ({ ...prev, speedLimit: e.target.value }))}
            />
          </div>
          {/* 过期时间设置 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expires" className="text-right">
              过期时间
            </Label>
            <Input
              id="expires"
              type="datetime-local"
              className="col-span-3"
              value={settings.expires}
              onChange={(e) => setSettings((prev) => ({ ...prev, expires: e.target.value }))}
            />
          </div>
          {/* 描述信息设置 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comment" className="text-right">
              描述信息
            </Label>
            <Textarea
              id="comment"
              className="col-span-3"
              placeholder="可选的描述信息"
              value={settings.comment}
              onChange={(e) => setSettings((prev) => ({ ...prev, comment: e.target.value }))}
            />
          </div>
          {/* 底部按钮区域 */}
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={isLoading || !transferInfo.downloadCode}>
              {isLoading ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
