'use client'

import { getColumns } from './columns'
import { TransferCodeList } from '@/components/settings/transfer-code-list'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { SettingsTitle } from '@/components/settings/settings-title'

export default function MyQuickTransferPage() {
  return (
    <SettingsLayout title="我的快传">
      <SettingsTitle title="我的快传" description="管理您的快传码，查看已分享的文件" />

      <TransferCodeList type="DOWNLOAD" getColumnsAction={getColumns} />
    </SettingsLayout>
  )
}
