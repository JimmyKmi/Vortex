export type TransferCodeType = 'UPLOAD' | 'COLLECTION' | 'DOWNLOAD'

export type TransferCode = {
  id: string
  code: string
  comment: string
  type: TransferCodeType
  disableReason: string | null
  expires: Date | null
  speedLimit: number | null
  usageLimit: number | null
  createdAt: Date
  updatedAt: Date
}

export type RefreshCallback = () => void

export interface TransferCodeListProps {
  // 基本配置
  type: TransferCodeType

  // 列和操作
  getColumnsAction: (actions: ColumnActions) => any[]

  // 回调函数
  onRefreshRef?: React.MutableRefObject<RefreshCallback | undefined>
}

export interface ColumnActions {
  onRefresh?: () => void
}
