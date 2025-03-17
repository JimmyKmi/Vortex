'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useActivityDetector } from './useActivityDetector'
import axios from 'axios'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getApiErrorMessage } from '@/lib/utils/error-messages'
import { TransferInfo } from '@/types/transfer-session'

interface UseTransferSessionProps {
  sessionId: string // 传输会话ID
}

/**
 * 传输会话Hook
 * 用于维护文件传输过程中的会话状态，通过心跳机制保持会话活跃
 *
 * @example
 * ```typescript
 * const { isActive, transferInfo, isValidating, checkSessionActive } = useTransferSession({ sessionId: 'xxx' })
 *
 * // 使用检查方法来判断会话是否活跃
 * const handleSomeAction = () => {
 *   if (checkSessionActive()) {
 *     // 会话活跃，继续操作
 *   }
 * }
 * ```
 *
 * 功能特性：
 * 1. 用户活动时自动发送心跳（间隔30秒）
 * 2. 用户20分钟无活动则停止心跳
 * 3. 心跳失败自动重试，连续失败超过2分钟提示网络异常
 * 4. 自动获取和维护传输会话信息
 * 5. 提供会话状态检查方法，自动处理过期提示
 * 6. 会话状态变化时自动提示
 */
export function useTransferSession({ sessionId }: UseTransferSessionProps) {
  const [isActive, setIsActive] = useState(false) // 会话活跃状态
  const [isValidating, setIsValidating] = useState(true) // 会话验证状态
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null) // 传输会话信息
  const heartbeatTimeout = useRef<NodeJS.Timeout>() // 心跳定时器
  const retryTimeout = useRef<NodeJS.Timeout>() // 重试定时器
  const lastHeartbeatTime = useRef<number>(0) // 最后心跳时间戳
  const lastFailureTime = useRef<number>(0) // 最后失败时间戳
  const previousActiveState = useRef<boolean>(false) // 保存上一个活跃状态
  const router = useRouter()

  // 获取传输会话信息
  const fetchTransferInfo = useCallback(async () => {
    try {
      setIsValidating(true)
      const response = await axios.get(`/api/transfer-sessions/${sessionId}/status`)
      if (response.data.code === 'Success') {
        setTransferInfo(response.data.data)
      } else {
        toast.error(getApiErrorMessage(response.data))
        router.push('/')
      }
    } catch (error: any) {
      console.error('Get transfer info error:', error)
      toast.error(getApiErrorMessage(error))
      router.push('/')
    } finally {
      setIsValidating(false)
    }
  }, [sessionId, router])

  const sendHeartbeat = useCallback(
    async (force: boolean = false) => {
      // 修改判断条件：移除 isActive 状态检查
      if (!force && Date.now() - lastHeartbeatTime.current < 5000) return

      try {
        lastHeartbeatTime.current = Date.now()
        await axios.post(`/api/transfer-sessions/${sessionId}/heartbeat`)
        setIsActive(true)
        lastFailureTime.current = 0

        if (retryTimeout.current) {
          clearTimeout(retryTimeout.current)
          retryTimeout.current = undefined
        }
      } catch (error: any) {
        console.error('Failed to send heartbeat:', error)
        const currentTime = Date.now()
        if (lastFailureTime.current === 0) lastFailureTime.current = currentTime

        // 处理会话失效
        if (error?.response?.data?.code === 'InvalidSession') {
          setIsActive(false)
          toast.error('会话已过期')
          router.push('/')
          return
        }

        if (currentTime - lastFailureTime.current >= 120 * 1000) toast.error('网络连接不稳定，请检查网络后刷新页面重试')
        retryTimeout.current = setTimeout(() => sendHeartbeat(true), 10 * 1000)
      }
    },
    [sessionId, router]
  )

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeout.current) return

    sendHeartbeat(true).then()
    heartbeatTimeout.current = setInterval(() => sendHeartbeat(false), 30 * 1000)
  }, [sendHeartbeat])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeout.current) {
      clearInterval(heartbeatTimeout.current)
      heartbeatTimeout.current = undefined
    }
  }, [])

  // 初始化心跳和获取传输信息
  useEffect(() => {
    if (sessionId) {
      startHeartbeat()
      void fetchTransferInfo()
    }
  }, [sessionId, startHeartbeat, fetchTransferInfo])

  // 用户活动检测
  useActivityDetector({
    enabled: true,
    onActivityAction: startHeartbeat,
    onInactivity: stopHeartbeat,
    inactivityTime: 20 * 60 * 1000 // 20分钟
  })

  // 组件卸载时清理
  const cleanup = useCallback(() => {
    setIsActive(false)
    stopHeartbeat()
  }, [stopHeartbeat])

  useEffect(() => () => cleanup(), [cleanup])

  /**
   * 检查会话是否活跃，如果不活跃则显示提示
   * @returns 会话是否活跃
   */
  const checkSessionActive = useCallback(() => {
    if (isValidating || !transferInfo) return false

    if (!isActive) {
      toast.error('会话已过期，请重新验证')
      return false
    }

    return true
  }, [isActive, isValidating, transferInfo])

  // 监控会话状态变化，当会话从活跃变为非活跃时自动显示提示
  useEffect(() => {
    // 初始化或正在验证时不处理
    if (isValidating || !transferInfo) {
      previousActiveState.current = isActive
      return
    }

    // 当状态从活跃变为非活跃时显示提示
    if (previousActiveState.current && !isActive) {
      toast.error('会话已过期，请重新验证')
    }

    previousActiveState.current = isActive
  }, [isActive, isValidating, transferInfo])

  return {
    isActive,
    isValidating,
    transferInfo,
    setTransferInfo,
    cleanup,
    checkSessionActive
  }
}
