'use client'

import React, {useEffect} from 'react'
import {Header} from './header'
import {Footer} from './footer'
import {useTheme} from '@/contexts/theme-context'
import {useSession, signOut} from 'next-auth/react'
import {NEXT_PUBLIC_APP_NAME} from '@/lib/config/env'
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
                                         onLogout = () => signOut({redirectTo: '/signin'}),
                                         width = 'full',
                                         title,
                                         bgTransparent = false,
                                         buttonType = null,
                                         backPath
                                       }) => {
  const {theme} = useTheme();
  const {data: session} = useSession();

  useEffect(() => {
    document.title = `${title ? title + " | " : ""}${NEXT_PUBLIC_APP_NAME || 'VORTËX'}`;
    // 如果用户角色是 unused，自动登出
    if (session?.user?.enabled === false) void signOut({redirectTo: '/signin'});
  }, [session, onLogout, title]);

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
      <Footer/>
    </div>
  )
}

export default Layout