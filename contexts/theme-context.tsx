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
  
  // 初始化系统主题和监听系统主题变化
  useEffect(() => {
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
  }, [])

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return
      const newTheme = e.newValue as Theme | null
      if (newTheme) setTheme(newTheme)
      else setTheme(systemTheme)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [systemTheme])

  // 从 localStorage 恢复存储的主题设置
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    if (storedTheme) setTheme(storedTheme)
    else setTheme(systemTheme)
  }, [systemTheme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    if (newTheme !== systemTheme) localStorage.setItem(THEME_KEY, newTheme)
    else localStorage.removeItem(THEME_KEY)
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      isSystemTheme: !localStorage.getItem(THEME_KEY) 
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

