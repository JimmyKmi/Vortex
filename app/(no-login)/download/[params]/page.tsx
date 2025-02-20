/**
 * 文件下载页面组件
 *
 * 主要功能：
 * - 支持文件夹层级展示
 * - 支持文件和文件夹选择
 * - 支持批量下载(待实现)
 */

'use client'

interface PageProps {
  params: Promise<{
    params: string;
  }>;
  searchParams: { [key: string]: string | string[] | undefined };
}

import {useEffect, useState, use} from 'react'
import {useRouter} from 'next/navigation'
import Layout from '@/components/layout'
import axios from "axios"
import {Title} from "@/components/title"
import {Button} from "@/components/ui/button"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {
  FileIcon, ChevronRight, ChevronDown, FolderIcon, Copy, Clock, Calendar, Hash, User, Check
} from 'lucide-react'
import {Checkbox} from "@/components/ui/checkbox"
import React from 'react'
import {toast} from "sonner"
import {getApiErrorMessage} from "@/lib/utils/error-messages"
import {TransferInfo} from "@/types/transfer-session"
import {formatFileSize} from "@/lib/utils/file"
import DownloadComplete from './complete'
import {useTransferSession} from "@/hooks/useTransferSession"
import {Skeleton} from "@/components/ui/skeleton"

// 下载文件类型定义
interface DownloadFile {
  id: string;
  name: string;
  size: string;
  sizeInBytes: number;
  type: 'file' | 'folder';
  children?: DownloadFile[];
  relativePath?: string;
  selected?: boolean;
}

// 限制传输会话状态类型
interface DownloadTransferInfo extends TransferInfo {
  status: 'DOWNLOADING' | 'COMPLETED';  // 下载只需要这两个状态
  type: 'DOWNLOAD';  // 限制类型为下载
}

export default function DownloadPage({params}: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const sessionId = resolvedParams.params
  const [isValidating, setIsValidating] = useState(true)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [transferInfo, setTransferInfo] = useState<DownloadTransferInfo | null>(null)
  const [files, setFiles] = useState<DownloadFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCopied, setIsCopied] = useState(false)
  const {isActive} = useTransferSession({sessionId})

  /**
   * 获取传输会话信息
   */
  const fetchTransferInfo = async () => {
    try {
      setIsValidating(true)
      const response = await axios.get(`/api/transfer-sessions/${sessionId}/status`)
      if (response.data.code === "Success") {
        setTransferInfo(response.data.data)
      } else {
        toast.error(getApiErrorMessage(response.data))
        router.push("/")
      }
    } catch (error: any) {
      console.error("Get transfer info error:", error)
      toast.error(getApiErrorMessage(error))
      router.push("/")
    } finally {
      setIsValidating(false)
    }
  }

  /**
   * 获取文件列表
   */
  const fetchFileList = async () => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }

    try {
      setIsLoadingFiles(true)
      const response = await axios.get(`/api/transfer-sessions/${sessionId}/download/file-list`)
      if (response.data.code === "Success") {
        setFiles(response.data.data)
      } else {
        toast.error(getApiErrorMessage(response.data))
      }
    } catch (error: any) {
      console.error("Get file list error:", error)
      toast.error(getApiErrorMessage(error))
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // 初始化加载
  useEffect(() => {
    if (sessionId) {
      fetchTransferInfo()
    }
  }, [sessionId])

  // 监听会话状态变化，当会话激活时获取文件列表
  useEffect(() => {
    if (isActive && !isValidating && transferInfo) {
      fetchFileList()
    }
  }, [isActive, isValidating])

  // 监听状态变化，确保状态更新完成后再刷新页面
  useEffect(() => {
    if (transferInfo?.status === "COMPLETED") router.refresh()
  }, [transferInfo?.status, router])

  /**
   * 切换文件夹展开/折叠状态
   */
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId)
      return newSet
    })
  }

  /**
   * 获取文件夹的所有子文件ID（包括子文件夹的文件）
   */
  const getFolderChildrenIds = (folder: DownloadFile): string[] => {
    const ids: string[] = []
    if (folder.children) {
      folder.children.forEach(child => {
        ids.push(child.id)
        if (child.type === 'folder') ids.push(...getFolderChildrenIds(child))
      })
    }
    return ids
  }

  /**
   * 获取文件夹的选中状态
   */
  const getFolderCheckState = (folder: DownloadFile, selectedSet: Set<string>): boolean => {
    if (!folder.children?.length) return false

    const selectedChildren = folder.children.filter(child => {
      if (child.type === 'folder') return getFolderCheckState(child, selectedSet)
      return selectedSet.has(child.id)
    })

    return selectedChildren.length === folder.children.length && selectedChildren.length > 0
  }

  /**
   * 查找并更新所有父文件夹的状态
   */
  const updateParentFoldersState = (fileId: string, selectedSet: Set<string>) => {
    const updateFolder = (files: DownloadFile[], parentPath: DownloadFile[] = []): boolean => {
      for (const file of files) {
        if (file.type === 'folder' && file.children) {
          // 检查当前文件夹是否包含目标文件
          const containsTarget = file.children.some(child => child.id === fileId) ||
            file.children.some(child => child.type === 'folder' && updateFolder([child], [...parentPath, file]))

          if (containsTarget) {
            // 更新当前文件夹的状态
            const checked = getFolderCheckState(file, selectedSet)
            checked ? selectedSet.add(file.id) : selectedSet.delete(file.id)
            return true
          }
        }
      }
      return false
    }

    updateFolder(files)
  }

  /**
   * 处理文件选中状态变更
   */
  const handleFileSelect = (fileId: string, checked: boolean, file: DownloadFile) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)

      // 处理当前文件
      checked ? newSet.add(fileId) : newSet.delete(fileId)

      // 如果是文件夹，处理所有子文件
      if (file.type === 'folder') {
        const processChildren = (folder: DownloadFile) => {
          folder.children?.forEach(child => {
            checked ? newSet.add(child.id) : newSet.delete(child.id)
            if (child.type === 'folder') processChildren(child)
          })
        }
        processChildren(file)
      }

      // 更新所有父文件夹的状态
      updateParentFoldersState(fileId, newSet)
      return newSet
    })
  }

  /**
   * 获取所有文件ID（包括文件夹内的文件）
   */
  const getAllFileIds = (files: DownloadFile[]): string[] => {
    return files.reduce((acc: string[], file) => {
      acc.push(file.id)
      if (file.type === 'folder' && file.children) {
        acc.push(...getAllFileIds(file.children))
      }
      return acc
    }, [])
  }

  /**
   * 处理全选/反选
   */
  const handleSelectAll = (checked: boolean) => {
    setSelectedFiles(() => {
      const newSet = new Set<string>()
      if (checked) {
        // 获取所有文件和文件夹的ID
        const getAllIds = (items: DownloadFile[]): void => {
          items.forEach(item => {
            newSet.add(item.id)
            if (item.type === 'folder' && item.children) {
              getAllIds(item.children)
            }
          })
        }
        getAllIds(files)
      }
      return newSet
    })
  }

  /**
   * 处理反选
   */
  const handleInvertSelection = () => {
    const allIds = getAllFileIds(files)
    const newSelected = allIds.filter(id => !selectedFiles.has(id))
    setSelectedFiles(new Set(newSelected))
  }

  /**
   * 获取选中的实际文件数量（不包含文件夹）
   */
  const getSelectedFilesCount = (currentFiles: DownloadFile[]): number => {
    return currentFiles.reduce((count, file) => {
      if (file.type === 'folder') return count + (file.children ? getSelectedFilesCount(file.children) : 0)
      return count + (selectedFiles.has(file.id) ? 1 : 0)
    }, 0)
  }

  /**
   * 渲染文件/文件夹列表项
   */
  const renderFileItem = (file: DownloadFile, depth: number = 0): React.ReactNode => {
    const isFolder = file.type === 'folder'
    const isExpanded = expandedFolders.has(file.id)
    const checked = isFolder
      ? getFolderCheckState(file, selectedFiles)
      : selectedFiles.has(file.id)

    return (
      <React.Fragment key={file.id}>
        <TableRow>
          <TableCell className="w-[40px]">
            <Checkbox
              checked={checked}
              onCheckedChange={(checked) => handleFileSelect(file.id, checked as boolean, file)}
            />
          </TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center" style={{paddingLeft: `${depth * 20}px`}}>
              {isFolder ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 p-0"
                  onClick={() => toggleFolder(file.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                </Button>
              ) : (
                <div className="w-6 h-6"/>
              )}
              <div className="flex items-center max-w-full">
                {isFolder ?
                  <FolderIcon className="mr-2 h-4 w-4 flex-shrink-0"/> :
                  <FileIcon className="mr-2 h-4 w-4 flex-shrink-0"/>}
                <span className="truncate" title={file.name}>{file.name}</span>
              </div>
            </div>
          </TableCell>
          <TableCell className="text-right">{file.size}</TableCell>
        </TableRow>
        {isFolder && isExpanded && file.children?.map(child => renderFileItem(child, depth + 1))}
      </React.Fragment>
    )
  }

  // 在 return 语句前添加完成处理函数
  const handleComplete = async () => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }

    try {
      const response = await axios.post(`/api/transfer-sessions/${sessionId}/download-complete`)
      if (response.data.code === "Success") {
        setTransferInfo(prev => ({
          ...prev!,
          status: "COMPLETED"
        }))
        toast.success("下载已完成")
      } else {
        toast.error(getApiErrorMessage(response.data))
      }
    } catch (error: any) {
      console.error("Complete download error:", error)
      toast.error(getApiErrorMessage(error))
    }
  }

  // 渲染骨架屏
  const renderSkeleton = () => {
    return (
      <React.Fragment>
        {[1, 2, 3].map((i) => (
          <TableRow key={i}>
            <TableCell className="w-[40px]">
              <Skeleton className="h-4 w-4"/>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4"/>
                <Skeleton className="h-4 w-[200px]"/>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-[60px] ml-auto"/>
            </TableCell>
          </TableRow>
        ))}
      </React.Fragment>
    )
  }

  if (isValidating || !transferInfo) return (
    <Layout width="middle">
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">{isValidating ? "正在验证会话..." : "会话异常，请刷新重试"}</p>
      </div>
    </Layout>
  )

  // 如果状态是已完成，显示完成页面
  if (transferInfo.status === "COMPLETED") {
    return <DownloadComplete transferInfo={transferInfo}/>
  }

  return (
    <Layout width="middle" title="文件下载">
      <div className="space-y-4">
        <Title buttonType="back" title="下载"/>
        
        {/* 传输信息展示区域 */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">传输信息</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(transferInfo.code).then(() => {
                    setIsCopied(true)
                    toast.success("传输码已复制到剪贴板")
                    setTimeout(() => setIsCopied(false), 2000)
                  }).catch(() => {
                    toast.error("复制失败，请手动复制")
                  })
                }}
                className="text-sm text-muted-foreground hover:text-foreground p-0 flex items-center gap-1"
              >
                <Copy className="h-4 w-4"/>
                {isCopied ? "复制成功" : "点击此处复制传输码"}
              </Button>
            </div>
            <div className="grid gap-2 text-sm grid-cols-1 sm:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4"/>
                  创建者
                </span>
                <span>{transferInfo.createdBy || "未知"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4"/>
                  创建时间
                </span>
                <span>{new Date(transferInfo.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Hash className="h-4 w-4"/>
                  使用限制
                </span>
                <span>{transferInfo.usageLimit ? `${transferInfo.usageLimit}次` : "不限"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4"/>
                  剩余次数
                </span>
                <span>
                  {transferInfo.usageLimit
                    ? `${transferInfo.usageLimit - (transferInfo.usedCount || 0)}次`
                    : "不限"}
                </span>
              </div>
              {transferInfo.comment && (
                <div className="pt-2 border-t col-span-1 sm:col-span-2">
                  <p className="text-muted-foreground">描述信息：</p>
                  <p className="mt-1">{transferInfo.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {files.length === 0 && !isLoadingFiles ? (
          <div className="text-center text-muted-foreground py-8">
            暂无文件
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between gap-2 items-center bg-muted/50 p-2 rounded-lg">
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInvertSelection}
                  className="h-8"
                >
                  反选
                </Button>
                <span className="text-sm text-muted-foreground">
                  已选择 {getSelectedFilesCount(files)} 个文件
                </span>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleComplete}
                className="h-8"
              >
                <Check className="mr-2 h-4 w-4"/>
                完成下载
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={files.length > 0 && selectedFiles.size === getAllFileIds(files).length}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead className="text-right">大小</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingFiles ? renderSkeleton() : files.map(file => renderFileItem(file))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </Layout>
  )
} 