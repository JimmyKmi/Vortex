"use client"

import {useEffect, useCallback, useState, useRef} from "react"
import {useActivityDetector} from "./useActivityDetector"
import axios from "axios"
import {toast} from "sonner"
import {useRouter} from "next/navigation"

interface UseTransferSessionProps {
  sessionId: string
}

/**
 * 传输会话Hook
 * 用于维护文件传输过程中的会话状态，主要功能：
 * 1. 定期发送心跳保持会话活跃
 * 2. 监听用户活动时发送心跳
 * 3. 处理会话过期的情况
 */
export function useTransferSession({
                                     sessionId
                                   }: UseTransferSessionProps) {
  const [isActive, setIsActive] = useState(false)        // 初始状态设为 false
  const heartbeatTimeout = useRef<NodeJS.Timeout>()     // 心跳定时器
  const retryTimeout = useRef<NodeJS.Timeout>()         // 重试定时器
  const lastHeartbeatTime = useRef<number>(0)          // 上次发送心跳的时间
  const lastFailureTime = useRef<number>(0)            // 首次失败的时间
  const router = useRouter()

  /**
   * 发送心跳请求
   * @param force 是否强制发送心跳（忽略时间间隔限制）
   */
  const sendHeartbeat = useCallback(async (force: boolean = false) => {
    // 非强制模式下，检查发送条件
    if (!force && (
      !isActive ||
      (Date.now() - lastHeartbeatTime.current) < 30 * 1000
    )) return

    try {
      lastHeartbeatTime.current = Date.now()
      await axios.post(`/api/transfer-sessions/${sessionId}/heartbeat`)
      // 心跳成功，激活会话
      setIsActive(true)
      // 重置失败时间
      lastFailureTime.current = 0
      // 清除重试定时器
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current)
        retryTimeout.current = undefined
      }
    } catch (error: any) {
      console.error("Failed to send heartbeat:", error)

      // 记录首次失败时间
      const currentTime = Date.now()
      if (lastFailureTime.current === 0) lastFailureTime.current = currentTime

      const errorCode = error?.response?.data?.code
      // 主观错误：会话无效，标记会话失效并跳转
      if (errorCode === "InvalidSession") {
        setIsActive(false)
        toast.error("会话已过期")
        router.push("/")
        return
      }

      // 客观错误：网络错误、服务器错误等
      if (currentTime - lastFailureTime.current >= 120 * 1000) toast.error("网络连接不稳定，请检查网络后刷新页面重试")

      // 设置10秒后重试
      retryTimeout.current = setTimeout(() => sendHeartbeat(true), 10 * 1000)
    }
  }, [sessionId, isActive, router])

  // 初始化验证
  useEffect(() => {
    if (sessionId) sendHeartbeat(true).then()
  }, [sessionId, sendHeartbeat])

  // 设置定期心跳
  useEffect(() => {
    if (!isActive) return
    heartbeatTimeout.current = setInterval(() => sendHeartbeat(false), 60 * 1000)
    return () => {
      if (heartbeatTimeout.current) clearInterval(heartbeatTimeout.current)
      if (retryTimeout.current) clearTimeout(retryTimeout.current)
    }
  }, [isActive, sendHeartbeat])

  useActivityDetector({
    enabled: isActive,
    onActivityAction: () => sendHeartbeat(false)
  })

  // 清理函数
  const cleanup = useCallback(() => {
    setIsActive(false)
    if (heartbeatTimeout.current) clearInterval(heartbeatTimeout.current)
    if (retryTimeout.current) clearTimeout(retryTimeout.current)
  }, [])

  // 如果设置了自动清理，在组件卸载时自动清理
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    isActive,
    cleanup
  }
} 