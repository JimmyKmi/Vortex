'use client'

import {useState, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import Layout from '@/components/layout'
import {REGEXP_ONLY_DIGITS_AND_CHARS} from "input-otp"
import axios from "axios"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {getApiErrorMessage} from "@/lib/utils/error-messages"

export default function Page() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const router = useRouter()

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

      if (response.data.code === "Success") {
        setStatusMessage("正在创建会话...")
        const {redirectTo} = response.data.data
        router.push(redirectTo)
      } else {
        const message = getApiErrorMessage(response.data)
        setStatusMessage(message)
      }
    } catch (error: any) {
      console.error('Transfer code validation error:', error)
      const message = getApiErrorMessage(error)
      setStatusMessage(message)
      if (error.response?.data?.code === "InvalidTransferCode") setCode("")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setCode(upperValue)
    setStatusMessage('')  // 用户开始输入时清除状态信息
    if (upperValue.length === 6 && !isLoading) void handleTransferCode(upperValue)
  }

  return (
    <Layout
      onLoginClick={handleLoginClick}
      onLogout={handleLogout}
      width="min"
      bgTransparent
    >
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="text-center space-y-2 mb-0">
            <h1 className="text-3xl font-bold">文件快传</h1>
            <p
              className={`${statusMessage.startsWith("正在") ? "text-yellow-500 dark:text-yellow-400" : statusMessage ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
              {isLoading ? "正在验证..." : statusMessage || "输入传输码开始传输文件"}
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
                <InputOTPSlot index={0}/>
                <InputOTPSlot index={1}/>
                <InputOTPSlot index={2}/>
                <InputOTPSlot index={3}/>
                <InputOTPSlot index={4}/>
                <InputOTPSlot index={5}/>
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
      </div>
    </Layout>
  )
}

