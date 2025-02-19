/**
 * 用户活动检测钩子
 * 用于监听用户在页面上的各种交互活动（如鼠标移动、点击、键盘输入等）
 * 当检测到用户活动时，会触发指定的回调函数
 */

"use client"

import { useEffect, useCallback } from "react"

/**
 * 活动检测钩子的参数接口
 * @interface UseActivityDetectorProps
 * @property {Function} onActivityAction - 检测到用户活动时触发的回调函数
 * @property {boolean} [enabled=true] - 是否启用活动检测，默认为true
 */
interface UseActivityDetectorProps {
  onActivityAction: () => void
  enabled?: boolean
}

/**
 * 用户活动检测钩子
 * @param {UseActivityDetectorProps} props - 钩子配置参数
 */
export function useActivityDetector({
  onActivityAction,
  enabled = true
}: UseActivityDetectorProps) {
  // 处理用户活动的回调函数
  const handleActivity = useCallback(() => {
    if (enabled) onActivityAction()
  }, [enabled, onActivityAction])

  useEffect(() => {
    if (!enabled) return

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "focus"
    ]

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, handleActivity])
} 