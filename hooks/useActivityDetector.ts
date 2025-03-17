/**
 * 用户活动检测钩子
 * 用于监听用户在页面上的各种交互活动，并提供活动/不活动状态的回调
 *
 * @example
 * ```typescript
 * useActivityDetector({
 *   onActivityAction: () => console.log('用户活动了'),
 *   onInactivity: () => console.log('用户已经20分钟没有活动了'),
 *   enabled: true
 * })
 * ```
 */

'use client'

import { useEffect, useCallback, useRef } from 'react'

/**
 * 活动检测钩子的参数接口
 * @interface UseActivityDetectorProps
 * @property {Function} onActivityAction - 检测到用户活动时触发的回调函数
 * @property {Function} [onInactivity] - 用户不活动时触发的回调函数
 * @property {number} [inactivityTime] - 不活动时间阈值（毫秒），默认为 20 分钟
 * @property {boolean} [enabled=true] - 是否启用活动检测，默认为true
 */
interface UseActivityDetectorProps {
  onActivityAction: () => void // 检测到用户活动时的回调
  onInactivity?: () => void // 用户不活动达到阈值时的回调
  inactivityTime?: number // 不活动时间阈值（毫秒）
  enabled?: boolean // 是否启用检测
}

/**
 * 用户活动检测钩子
 * @param {UseActivityDetectorProps} props - 钩子配置参数
 */
export function useActivityDetector({
  onActivityAction,
  onInactivity,
  inactivityTime = 20 * 60 * 1000, // 默认20分钟
  enabled = true
}: UseActivityDetectorProps) {
  const inactivityTimeout = useRef<NodeJS.Timeout>()
  const lastActivityTime = useRef<number>(Date.now())

  // 处理用户活动的回调函数
  const handleActivity = useCallback(() => {
    if (!enabled) return

    // 更新最后活动时间
    lastActivityTime.current = Date.now()

    // 清除之前的不活动定时器
    if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current)

    // 设置新的不活动定时器
    if (onInactivity)
      inactivityTimeout.current = setTimeout(() => {
        const currentInactiveTime = Date.now() - lastActivityTime.current
        if (currentInactiveTime >= inactivityTime) {
          onInactivity()
        }
      }, inactivityTime)

    // 触发活动回调
    onActivityAction()
  }, [enabled, inactivityTime, onActivityAction, onInactivity])

  useEffect(() => {
    if (!enabled) return

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'focus']

    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    // 初始化不活动定时器
    if (onInactivity) {
      inactivityTimeout.current = setTimeout(() => {
        const currentInactiveTime = Date.now() - lastActivityTime.current
        if (currentInactiveTime >= inactivityTime) onInactivity()
      }, inactivityTime)
    }

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current)
    }
  }, [enabled, handleActivity, inactivityTime, onInactivity])
}
