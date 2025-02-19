'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Layout from '@/components/layout'
import axios from "axios"
import { getApiErrorMessage } from "@/lib/utils/error-messages"

export default function DownloadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isValidating, setIsValidating] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [transferInfo, setTransferInfo] = useState<{
    id: string
    code: string
    type: string
  } | null>(null)

  useEffect(() => {
    const validateTransferCode = async () => {
      const id = searchParams.get('id')
      const code = searchParams.get('code')

      if (!id || !code) {
        setErrorMessage("无效的传输参数")
        router.push('/')
        return
      }

      try {
        const response = await axios.post('/api/verify-transfer-code', { code })
        
        if (response.data.code === "Success") {
          const data = response.data.data
          if (data.id !== id || data.code !== code) {
            throw new Error("传输参数不匹配")
          }
          if (data.type === "UPLOAD" || data.type === "COLLECT") {
            throw new Error("无效的传输类型")
          }
          setTransferInfo(data)
        } else {
          throw new Error(getApiErrorMessage(response.data))
        }
      } catch (error: any) {
        console.error('Transfer code validation error:', error)
        const errorMessage = error.response?.data?.message || 
          error.message || "验证失败，请重新获取传输码"
        setErrorMessage(errorMessage)
        router.push('/')
      } finally {
        setIsValidating(false)
      }
    }

    validateTransferCode()
  }, [searchParams, router])

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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">文件下载</h1>
          <p className="text-muted-foreground">
            传输码：{transferInfo.code}
          </p>
        </div>
        
        {/* 这里添加文件下载相关的UI组件 */}
        <div className="text-center text-muted-foreground">
          文件下载功能开发中...
        </div>
      </div>
    </Layout>
  )
} 