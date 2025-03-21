'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'
import axios from 'axios'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { getApiErrorMessage } from '@/lib/utils/error-messages'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Page() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const response = await axios.get('/api/public-settings')
        const { MOTD } = response.data
        if (MOTD && typeof MOTD === 'string' && MOTD.trim() !== '') {
          setAnnouncement(MOTD)
          setIsAnnouncementVisible(true)
        }
      } catch (error) {
        console.error('获取公共设置失败:', error)
      }
    }
    void fetchPublicSettings()
  }, [])

  const handleLoginClick = useCallback(() => {
    router.push('/signin')
  }, [router])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('isLoggedIn')
    router.push('/')
  }, [router])

  const handleTransferCode = async (value: string) => {
    if (value.length !== 6) return

    try {
      setIsLoading(true)
      setStatusMessage('')
      const response = await axios.post('/api/verify-transfer-code', {
        code: value
      })

      if (response.data.code === 'Success') {
        setStatusMessage('正在创建会话...')
        const { redirectTo } = response.data.data
        router.push(redirectTo)
      } else {
        const message = getApiErrorMessage(response.data)
        setStatusMessage(message)
      }
    } catch (error: any) {
      console.error('Transfer code validation error:', error)
      const message = getApiErrorMessage(error)
      setStatusMessage(message)
      if (error.response?.data?.code === 'InvalidTransferCode') setCode('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setCode(upperValue)
    setStatusMessage('') // 用户开始输入时清除状态信息
    if (upperValue.length === 6 && !isLoading) void handleTransferCode(upperValue)
  }

  const closeAnnouncement = () => {
    setIsAnnouncementVisible(false)
  }

  return (
    <>
      {announcement && isAnnouncementVisible && (
        <div className="fixed bottom-6 left-4 z-[70] max-w-[calc(100vw-2rem)] sm:max-w-xs">
          <Alert className="bg-white/90 dark:bg-black/90 border-blue-200 dark:border-blue-800 shadow-md pr-8 relative">
            <InfoIcon className="h-4 w-4 min-w-4 text-blue-500 dark:text-blue-400" />
            <AlertDescription className="break-words whitespace-normal">{announcement}</AlertDescription>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7 absolute top-0 right-0 p-4 hover:bg-slate-200 dark:hover:bg-slate-800" 
              onClick={closeAnnouncement}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">关闭</span>
            </Button>
          </Alert>
        </div>
      )}
      
      <Layout onLoginClick={handleLoginClick} onLogout={handleLogout} width="min" bgTransparent>
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="text-center space-y-2 mb-0">
              <h1 className="text-3xl font-bold">文件快传</h1>
              <p
                className={`${statusMessage.startsWith('正在') ? 'text-yellow-500 dark:text-yellow-400' : statusMessage ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}
              >
                {isLoading ? '正在验证...' : statusMessage || '输入传输码开始传输文件'}
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                value={code}
                onChange={handleOTPChange}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}
