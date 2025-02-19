import {Metadata} from "next"
import {DataTable} from "@/components/ui/data-table"
import {columns} from "./columns"
import {SettingsLayout} from '@/components/settings/settings-layout'
import {SettingsTitle} from '@/components/settings/settings-title'

export const metadata: Metadata = {
  title: "我的快传",
  description: "管理您的快速传输记录",
}

const mockData = [
  {
    id: "transfer_1",
    name: "项目设计文档.zip",
    code: "QUICK123",
    size: "125MB",
    downloads: 5,
    expireAt: "2024-03-01",
    createdAt: "2024-02-01",
  },
  {
    id: "transfer_2",
    name: "会议记录.docx",
    code: "QUICK456",
    size: "2.5MB",
    downloads: 2,
    expireAt: "2024-02-15",
    createdAt: "2024-02-01",
  },
]

export default function MyQuickTransferPage() {
  return (
    <SettingsLayout title="我的快传">
      <SettingsTitle
        title="我的快传"
        description="管理您创建的快速传输文件，查看下载记录或删除过期文件"
      />
      <DataTable columns={columns} data={mockData}/>
    </SettingsLayout>
  )
} 