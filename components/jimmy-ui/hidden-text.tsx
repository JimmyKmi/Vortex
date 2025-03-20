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
   * 模糊度，数值越大越模糊
   * @default 3
   */
  blurAmount?: number
  
  /**
   * 自定义类名
   */
  className?: string
}

/**
 * HiddenText组件 - 用于显示/隐藏敏感文本，点击时切换显示状态
 * 默认为隐藏状态，占位符为随机数字，长度自动跟随真实值变化
 * 
 * @example
 * ```tsx
 * <HiddenText text="sensitive-code-123456" />
 * ```
 */
export function HiddenText({
  text,
  placeholder,
  blurAmount = 3,
  className = ''
}: HiddenTextProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  // 生成随机数字占位符
  const randomPlaceholder = useMemo(() => {
    if (placeholder) return placeholder
    
    // 生成与原文本等长的随机数字字符串
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }, [text, placeholder]);
  
  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }
  
  return (
    <span 
      className={`font-mono cursor-pointer select-none transition-all duration-300 ${
        !isVisible ? `blur-[${blurAmount}px] select-none` : ''
      } ${className}`}
      onClick={toggleVisibility}
      title={isVisible ? "点击隐藏" : "点击显示"}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          toggleVisibility()
        }
      }}
    >
      {isVisible ? text : randomPlaceholder}
    </span>
  )
} 