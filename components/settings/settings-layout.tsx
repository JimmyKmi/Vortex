'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage
} from '@/components/ui/breadcrumb'
import { SettingsSidebar } from './settings-sidebar'
import { useTheme } from '@/contexts/theme-context'
import { getAppPublicSettings, DEFAULT_APP_NAME } from '@/lib/env'

interface SettingsLayoutProps {
  children: React.ReactNode
  title?: string
}

export function SettingsLayout({ children, title }: SettingsLayoutProps) {
  const router = useRouter()
  const { status } = useSession()
  const { theme } = useTheme()
  const [, setAppName] = useState(DEFAULT_APP_NAME)

  useEffect(() => {
    const fetchAppConfig = async () => {
      const settings = await getAppPublicSettings()
      setAppName(settings.appName)

      // 更新文档标题
      document.title = `${title ? title + ' | ' : ''}${settings.appName}`
    }

    void fetchAppConfig()
  }, [title])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/signin')
  }, [status, router])

  // 如果未登录，不渲染任何内容
  if (status === 'loading' || status === 'unauthenticated') return null

  return (
    <SidebarProvider>
      <SettingsSidebar />
      <SidebarInset>
        <header
          className="flex fixed h-14 w-full top-0 shrink-0 items-center gap-2 transition-[width,height] ease-linear
           group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12
            bg-white/80 dark:bg-black/80 backdrop-blur-lg shadow-sm"
        >
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6 mt-14 pt-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
