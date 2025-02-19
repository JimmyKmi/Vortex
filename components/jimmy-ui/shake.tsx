import React, {useEffect, useMemo} from 'react'
import { cn } from '@/lib/utils'

interface ShakeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

const createShakeStyles = () => {
  const styleElement = document.createElement('style')
  styleElement.textContent = `
    @keyframes perCharShake {
      0%, 100% { transform: translate(0, 0) rotate(0); }
      25% { transform: translate(var(--x1), var(--y1)) rotate(var(--r1)); }
      50% { transform: translate(var(--x2), var(--y2)) rotate(var(--r2)); }
      75% { transform: translate(var(--x3), var(--y3)) rotate(var(--r3)); }
    }
  `
  return styleElement
}

const Shake: React.FC<ShakeProps> = ({ 
  children,
  className,
  ...props
}) => {
  // 动态生成样式
  useEffect(() => {
    const style = createShakeStyles()
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // 生成每个字符的随机参数
  const getCharParams = useMemo(() => {
    return () => ({
      x1: `${Math.random() * 3 - 1.5}px`,
      y1: `${Math.random() * 3 - 1.5}px`,
      r1: `${Math.random() * 10 - 5}deg`,
      x2: `${Math.random() * 3 - 1.5}px`,
      y2: `${Math.random() * 3 - 1.5}px`,
      r2: `${Math.random() * 10 - 5}deg`,
      x3: `${Math.random() * 3 - 1.5}px`,
      y3: `${Math.random() * 3 - 1.5}px`,
      r3: `${Math.random() * 10 - 5}deg`,
    })
  }, [])

  const renderShakeableChildren = (child: React.ReactNode): React.ReactNode => {
    if (typeof child === 'string') {
      return child.split('').map((char, index) => {
        const { x1, y1, r1, x2, y2, r2, x3, y3, r3 } = getCharParams()
        
        const style = {
          '--x1': x1,
          '--y1': y1,
          '--r1': r1,
          '--x2': x2,
          '--y2': y2,
          '--r2': r2,
          '--x3': x3,
          '--y3': y3,
          '--r3': r3,
          animationDelay: `${Math.random() * 0.5}s`
        } as React.CSSProperties

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              animation: `perCharShake ${0.2 + Math.random() * 0.2}s ease-in-out infinite`,
              ...style
            }}
          >
            {char}
          </span>
        )
      })
    }

    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...child.props,
        children: renderShakeableChildren(child.props.children)
      })
    }

    return child
  }

  return (
    <span className={cn('inline-block', className)} {...props}>
      {renderShakeableChildren(children)}
    </span>
  )
}

export { Shake }