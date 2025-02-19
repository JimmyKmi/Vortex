'use client'

import React, {useEffect} from 'react'
import {Header} from './header'
import {Footer} from './footer'
import {useTheme} from '@/contexts/theme-context'
import {useSession, signOut} from 'next-auth/react'
import {NEXT_PUBLIC_APP_NAME} from '@/lib/config/env'

interface LayoutProps {
  children: React.ReactNode
  onLoginClick?: () => void
  onLogout?: () => void
  width?: 'full' | 'middle' | 'min'
  title?: string
  metaDescription?: string
}

const Layout: React.FC<LayoutProps> = ({
                                         children,
                                         onLoginClick = () => {
                                         },
                                         onLogout = () => signOut({redirectTo: '/signin'}),
                                         width = 'full',
                                         title,
                                       }) => {
  const {theme} = useTheme();
  const {data: session} = useSession();

  useEffect(() => {
    document.title = `${title ? title + " | " : ""}${NEXT_PUBLIC_APP_NAME || 'Jimmy FILË'}`;

    // 如果用户角色是 unused，自动登出
    if (session?.user?.enabled === false) {
      void signOut({redirectTo: '/signin'});
    }
  }, [session, onLogout, title]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <Header
        onLoginClick={onLoginClick}
        isLoggedIn={!!session}
        username={session?.user?.name || ''}
      />
      {width === 'full' ? children : (
        <main
          className={`flex-grow flex items-center justify-center self-center px-4 py-8 ${width === 'middle' ? "max-w-5xl w-full" : ""}${width === 'min' ? "max-w-lg w-full" : ""}`}>
          <div className="w-full max-w-4xl rounded-lg bg-card text-card-foreground">
            {children}
          </div>
        </main>
      )}
      <Footer/>
    </div>
  )
}

export default Layout