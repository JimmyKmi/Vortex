import { useState, useEffect } from 'react'

// 用于缓存设置的全局变量
let cachedSettings: any = null;
let cacheTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5分钟缓存

export function useAuthSettings() {
  const [settings, setSettings] = useState({
    allowRegistration: true,
    allowZitadel: false,
    zitadelIdpName: 'Zitadel'
  })
  const [isLoading, setIsLoading] = useState(cachedSettings === null)

  useEffect(() => {
    // 标记组件是否已卸载
    let isMounted = true;
    
    (async () => {
      try {
        // 判断是否可以使用缓存
        const now = Date.now();
        if (cachedSettings && (now - cacheTime < CACHE_DURATION)) {
          if (isMounted) {
            setSettings(cachedSettings);
            setIsLoading(false);
          }
          return;
        }
        
        setIsLoading(true);
        const response = await fetch('/api/public-settings');
        const data = await response.json();
        
        const newSettings = {
          allowRegistration: data.ALLOW_REGISTRATION,
          allowZitadel: data.ALLOW_ZITADEL_LOGIN,
          zitadelIdpName: data.ZITADEL_IDP_NAME || 'Zitadel'
        };
        
        // 更新缓存
        cachedSettings = newSettings;
        cacheTime = now;
        
        if (isMounted) {
          setSettings(newSettings);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('获取系统设置失败:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    
    // 清理函数，防止组件卸载后仍然设置状态
    return () => {
      isMounted = false;
    };
  }, []);

  return { ...settings, isLoading };
} 