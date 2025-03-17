'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { useSession } from 'next-auth/react'
import { SettingsTitle } from '@/components/settings/settings-title'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
    }
  }, [session, status, router])

  return (
    <SettingsLayout title="总览">
      <SettingsTitle title="总览" description="统计信息" />
    </SettingsLayout>
  )
}
