import React from 'react'
import {auth} from '@/auth'
import {UserRole} from '@/lib/roles'
import {notFound} from 'next/navigation'
import {SettingsLayout} from '@/components/settings/settings-layout'
import {SettingsTitle} from '@/components/settings/settings-title'
import {UsersTable} from './users-table'

export default async function UsersPage() {
  const session = await auth()

  // 如果不是管理员，显示 404
  if (!session || session.user?.role !== UserRole.ADMIN) {
    notFound()
  }

  return (
    <SettingsLayout title="用户管理">
      <SettingsTitle
        title="用户管理"
        description="管理系统用户账号"
      />
      <UsersTable session={session}/>
    </SettingsLayout>
  )
} 