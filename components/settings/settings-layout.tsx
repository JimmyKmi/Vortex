'use client'

import React, {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {useSession} from 'next-auth/react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {Separator} from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import {SettingsSidebar} from './settings-sidebar'

interface SettingsLayoutProps {
  children: React.ReactNode
  title: string
}

export function SettingsLayout({children, title}: SettingsLayoutProps) {
  const router = useRouter()
  const {status} = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    }
  }, [status, router])

  // 如果未登录，不渲染任何内容
  if (status === 'loading' || status === 'unauthenticated') {
    return null
  }

  return (
    <SidebarProvider>
      <SettingsSidebar/>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1"/>
            <Separator orientation="vertical" className="mr-2 h-4"/>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6 pt-1">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
