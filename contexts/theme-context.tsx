'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isSystemTheme: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const THEME_KEY = 'preferredTheme'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')
  const [systemTheme, setSystemTheme] = useState<Theme>('light')
  const [isSystemTheme, setIsSystemTheme] = useState(true)
  const [isClient, setIsClient] = useState(false)
  
  // 检测是否在客户端
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 初始化系统主题和监听系统主题变化
  useEffect(() => {
    if (!isClient) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const updateSystemTheme = (isDark: boolean) => {
      const newSystemTheme = isDark ? 'dark' : 'light'
      setSystemTheme(newSystemTheme)
      
      const storedTheme = localStorage.getItem(THEME_KEY)
      if (storedTheme === newSystemTheme) localStorage.removeItem(THEME_KEY)
      if (!storedTheme) setTheme(newSystemTheme)
    }

    updateSystemTheme(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => updateSystemTheme(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [isClient])

  // 监听 localStorage 变化
  useEffect(() => {
    if (!isClient) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return
      const newTheme = e.newValue as Theme | null
      if (newTheme) {
        setTheme(newTheme)
        setIsSystemTheme(false)
      } else {
        setTheme(systemTheme)
        setIsSystemTheme(true)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [systemTheme, isClient])

  // 从 localStorage 恢复存储的主题设置
  useEffect(() => {
    if (!isClient) return

    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
      setIsSystemTheme(false)
    } else {
      setTheme(systemTheme)
      setIsSystemTheme(true)
    }
  }, [systemTheme, isClient])

  const toggleTheme = () => {
    if (!isClient) return

    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    if (newTheme !== systemTheme) {
      localStorage.setItem(THEME_KEY, newTheme)
      setIsSystemTheme(false)
    } else {
      localStorage.removeItem(THEME_KEY)
      setIsSystemTheme(true)
    }
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme,
      isSystemTheme: isClient ? !localStorage.getItem(THEME_KEY) : true
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}

