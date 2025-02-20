/**
 * 下载完成页面组件
 */

'use client'

import {useRouter} from 'next/navigation'
import Layout from '@/components/layout'
import {Title} from "@/components/title"
import {Button} from "@/components/ui/button"
import {TransferInfo} from "@/types/transfer-session"
import {Home} from "lucide-react"

interface CompleteProps {
  transferInfo: TransferInfo
}

export default function DownloadComplete({transferInfo}: CompleteProps) {
  const router = useRouter()

  return (
    <Layout width="min">
      <div className="space-y-4">
        <Title buttonType="back" title="下载完成"/>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            文件下载已完成，感谢使用！
          </p>

          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4"/>
            返回首页
          </Button>
        </div>
      </div>
    </Layout>
  )
} 