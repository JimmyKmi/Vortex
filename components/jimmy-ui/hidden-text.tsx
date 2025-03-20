'use client'

import { useState, useMemo } from 'react'

interface HiddenTextProps {
  /**
   * 要显示/隐藏的文本内容
   */
  text: string

  /**
   * 自定义占位符文本，如不提供则自动生成随机数字占位符
   */
  placeholder?: string

  /**
   * 自定义类名
   */
  className?: string
}

/**
 * HiddenText组件 - 用于显示敏感文本，点击后永久显示
 * 默认为隐藏状态，占位符为随机数字，长度自动跟随真实值变化
 * 注意: 一旦显示后不能再次隐藏
 *
 * @example
 * ```tsx
 * <HiddenText text="sensitive-code-123456" />
 * ```
 */
export function HiddenText({ text, placeholder, className = '' }: HiddenTextProps) {
  const [isVisible, setIsVisible] = useState(false)

  // 生成随机数字占位符
  const randomPlaceholder = useMemo(() => {
    if (placeholder) return placeholder

    // 生成与原文本等长的随机数字字符串
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += Math.floor(Math.random() * 10).toString()
    }
    return result
  }, [text, placeholder])

  const showText = () => {
    if (!isVisible) {
      setIsVisible(true)
    }
  }

  return (
    <span
      className={`font-mono select-none transition-all duration-300 ${
        !isVisible ? `blur-[3px] select-none cursor-pointer` : ''
      } ${className}`}
      onClick={showText}
      title={isVisible ? '' : '点击显示'}
      role={isVisible ? undefined : 'button'}
      tabIndex={isVisible ? undefined : 0}
      onKeyDown={(e) => {
        if (!isVisible && (e.key === 'Enter' || e.key === ' ')) {
          showText()
        }
      }}
    >
      {isVisible ? text : randomPlaceholder}
    </span>
  )
}
