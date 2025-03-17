'use client'

import * as React from 'react'
import { ArrowLeft, ChartArea, Share2, Upload, Settings2, Users, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { UserRole } from '@/lib/roles'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { NavUser } from '@/components/nav-user'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface MenuItem {
  path: string
  label: string
  icon: React.ReactNode
  items?: MenuItem[]
}

export function SettingsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const menuItems = (role: UserRole) => {
    const baseItems: MenuItem[] = [
      {
        path: '/settings',
        label: '总览',
        icon: <ChartArea className="h-4 w-4" />
      },
      {
        path: '/settings/my-upload-code',
        label: '我的上传码',
        icon: <Upload className="h-4 w-4" />
      },
      {
        path: '/settings/my-quick-transfer',
        label: '我的快传',
        icon: <Share2 className="h-4 w-4" />
      }
    ]
    if (role === UserRole.ADMIN) {
      baseItems.push({
        path: '/settings/platform',
        label: '平台管理',
        icon: <Settings2 className="h-4 w-4" />,
        items: [
          {
            path: '/settings/platform/users',
            label: '用户管理',
            icon: <Users className="h-4 w-4" />
          },
          {
            path: '/settings/platform/system',
            label: '系统设置',
            icon: <Settings2 className="h-4 w-4" />
          }
        ]
      })
    }
    return baseItems
  }

  const renderMenuItem = (item: MenuItem) => {
    const isActive = pathname === item.path || (item.items && item.items.some((subItem) => pathname === subItem.path))

    if (item.items) {
      return (
        <Collapsible key={item.path} asChild defaultOpen={isActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={item.label}>
                {item.icon}
                <span>{item.label}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.path}>
                    <SidebarMenuSubButton asChild isActive={pathname === subItem.path}>
                      <a
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(subItem.path)
                        }}
                      >
                        {subItem.icon}
                        <span>{subItem.label}</span>
                      </a>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )
    }

    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton isActive={isActive} onClick={() => router.push(item.path)} tooltip={item.label}>
          {item.icon}
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold group-data-[state=collapsed]:hidden whitespace-nowrap">返回</span>
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>设置</SidebarGroupLabel>
          <SidebarMenu>{menuItems(session?.user?.role as UserRole).map(renderMenuItem)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session?.user || {}} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
