'use client'

import React, {useEffect, useState} from 'react'
import {Header} from './header'
import {Footer} from './footer'
import {useTheme} from '@/contexts/theme-context'
import {useSession, signOut} from 'next-auth/react'
import {
  getAppPublicSettings, 
  AppPublicSettings, 
  DEFAULT_APP_NAME, 
  DEFAULT_FOOTER, 
  DEFAULT_FOOTER_LINK
} from '@/lib/env'
import Background from './background'
import {Title} from "@/components/title";

interface LayoutProps {
  children: React.ReactNode
  onLoginClick?: () => void
  onLogout?: () => void
  width?: 'full' | 'middle' | 'min'
  title?: string
  metaDescription?: string
  bgTransparent?: boolean
  buttonType?: 'back' | 'home' | null
  backPath?: string
}

const Layout: React.FC<LayoutProps> = ({
                                         children,
                                         onLoginClick = () => {
                                         },
                                         width = 'full',
                                         title,
                                         bgTransparent = false,
                                         buttonType = null,
                                         backPath
                                       }) => {
  const {theme} = useTheme();
  const {data: session} = useSession();
  const [appConfig, setAppConfig] = useState<AppPublicSettings>({
    appName: DEFAULT_APP_NAME,
    footer: DEFAULT_FOOTER,
    footerLink: DEFAULT_FOOTER_LINK
  });

  useEffect(() => {
    // 组件挂载后获取应用配置
    const fetchAppConfig = async () => {
      const settings = await getAppPublicSettings();
      setAppConfig(settings);
      // 更新文档标题
      document.title = `${title ? title + " | " : ""}${settings.appName}`;
    };
    
    void fetchAppConfig();
    
    // 如果用户角色是 unused，自动登出
    if (session?.user?.enabled === false) void signOut({redirectTo: '/signin'});
  }, [session?.user?.enabled, title]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <Background/>
      <Header
        onLoginClick={onLoginClick}
        isLoggedIn={!!session}
        username={session?.user?.name || ''}
        bgTransparent={bgTransparent}
        appName={appConfig.appName}
      />
      {width === 'full' ? children :
        (<main
          className={`flex-grow flex items-center justify-center self-center p-0 sm:p-4 md:p-6 ${width === 'middle' ? "max-w-5xl w-full" : ""}${width === 'min' ? "max-w-lg w-full" : ""}`}>
          <div
            className={`w-full max-w-4xl rounded-none sm:rounded-lg text-card-foreground p-4 sm:p-4 md:p-6 ${bgTransparent ? "" : "bg-white/95 dark:bg-black/95 backdrop-blur-lg"}`}>
            {buttonType ?
              (<div className="flex flex-col space-y-4">
                <Title buttonType={buttonType} title={title} backPath={backPath}/>
                {children}
              </div>) :
              children
            }
          </div>
        </main>)
      }
      <Footer 
        footer={appConfig.footer} 
        footerLink={appConfig.footerLink}
      />
    </div>
  )
}

export default Layout