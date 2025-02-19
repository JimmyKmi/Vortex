import { useState, useEffect } from 'react'

export function useAuthSettings() {
  const [settings, setSettings] = useState({
    allowRegistration: true,
    allowZitadel: false,
    zitadelIdpName: 'Zitadel'
  })

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/public-settings')
        const data = await response.json()
        
        setSettings({
          allowRegistration: data.ALLOW_REGISTRATION,
          allowZitadel: data.ALLOW_ZITADEL_LOGIN,
          zitadelIdpName: data.ZITADEL_IDP_NAME || 'Zitadel'
        })
      } catch (error) {
        console.error('获取系统设置失败:', error)
      }
    })()
  }, [])

  return settings
} 