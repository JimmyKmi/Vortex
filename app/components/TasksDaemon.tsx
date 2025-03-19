'use client'

import { useEffect, useState, useRef } from 'react'
import { NODE_ENV } from '@/lib/env'

/**
 * 任务守护进程组件
 * 这个组件会在客户端挂载时检查定时任务状态并启动
 * 添加在根布局中以确保每次应用启动都会执行
 */
export function TasksDaemon() {
  const [, setStatus] = useState<string>('inactive')
  const hasChecked = useRef(false)

  useEffect(() => {
    async function startTasks() {
      // 避免重复检查
      if (hasChecked.current) return
      hasChecked.current = true

      try {
        // 尝试调用健康检查API以启动定时任务
        const response = await fetch('/api/health')
        const data = await response.json()
        
        setStatus(data.scheduler === 'running' ? 'running' : 'inactive')
      } catch (error) {
        console.error('Failed to call health check API', error)
        setStatus('failed')
      }
    }

    // 只在生产环境执行
    if (NODE_ENV !== 'production') {
      console.warn('Task daemon auto-start disabled in development')
    }
    void startTasks()
  }, [])

  // 不渲染任何内容，这只是一个功能性组件
  return null
}
