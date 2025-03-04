'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * 任务守护进程组件
 * 这个组件会在客户端挂载时检查定时任务状态并启动
 * 添加在根布局中以确保每次应用启动都会执行
 */
export function TasksDaemon() {
  const [, setStatus] = useState<string>('未启动');
  const hasChecked = useRef(false);

  useEffect(() => {
    async function startTasks() {
      // 避免重复检查
      if (hasChecked.current) return;
      hasChecked.current = true;

      try {
        // 尝试调用健康检查API以启动定时任务
        const response = await fetch('/api/health');
        const data = await response.json();
        
        console.log('定时任务守护进程 - 健康检查API响应:', data);
        setStatus(data.scheduler === 'running' ? '运行中' : '未启动');
      } catch (error) {
        console.error('定时任务守护进程 - 健康检查API调用失败:', error);
        setStatus('启动失败');
      }
    }

    // 只在生产环境执行
    if (process.env.NODE_ENV !== 'production') console.log('定时任务守护进程：开发环境下不自动启动');
    void startTasks();
  }, []);

  // 不渲染任何内容，这只是一个功能性组件
  return null;
} 