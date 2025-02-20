'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  autoMode: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')
  const [autoMode, setAutoMode] = useState(true)
  const [manualTheme, setManualTheme] = useState<Theme | null>(null)
  
  // 使用 ref 跟踪最新状态
  const stateRef = useRef({ autoMode, manualTheme })
  useEffect(() => {
    stateRef.current = { autoMode, manualTheme }
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handler = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light'
      const { autoMode, manualTheme } = stateRef.current
      
      // 自动模式直接同步
      if (autoMode) {
        setTheme(newSystemTheme)
        return
      }
      
      // 手动模式且系统主题与手动设置不同时恢复自动
      if (manualTheme !== newSystemTheme) {
        setAutoMode(true)
        setManualTheme(null)
        setTheme(newSystemTheme)
      }
    }

    // 立即执行一次初始化
    handler(mediaQuery as any)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, []) // 空依赖数组，只运行一次

  useEffect(() => {
    localStorage.setItem('theme', theme)
    localStorage.setItem('themeAuto', autoMode.toString())
    localStorage.setItem('themeManual', autoMode ? '' : (manualTheme || ''))
  }, [theme, autoMode, manualTheme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setAutoMode(false)
    setManualTheme(newTheme)
    setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, autoMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

