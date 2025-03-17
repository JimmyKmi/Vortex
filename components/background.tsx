'use client'

import React, { useEffect } from 'react'
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { useTheme } from '@/contexts/theme-context'

interface BackgroundProps {
  className?: string
}

const Background: React.FC<BackgroundProps> = ({ className }) => {
  const { theme } = useTheme()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <ShaderGradientCanvas
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1
      }}
    >
      {/*https://www.shadergradient.co/customize*/}
      <ShaderGradient
        // Shape
        type={theme === 'dark' ? 'sphere' : 'plane'}
        shader="defaults"
        uStrength={0.7}
        uDensity={4.1}
        // Colors
        color1={theme === 'dark' ? '#000080' : '#ffffff'}
        color2={theme === 'dark' ? '#000000' : '#abb6ff'}
        color3={theme === 'dark' ? '#000000' : '#ff8985'}
        grain="on" // 噪点
        brightness={theme === 'dark' ? 1.2 : 1.2}
        // Motion
        animate="on"
        uSpeed={theme === 'dark' ? 0.01 : 0.2}
        // View
        cDistance={theme === 'dark' ? 2.7 : 2}
        cAzimuthAngle={theme === 'dark' ? 130 : 0}
        cPolarAngle={theme === 'dark' ? 80 : 120}
        cameraZoom={7.2}
        positionX={0}
        positionY={theme === 'dark' ? -1.2 : 0}
        positionZ={0}
        rotationX={0}
        rotationY={0}
        rotationZ={theme === 'dark' ? 30 : 60}
      />
    </ShaderGradientCanvas>
  )
}

export default Background
