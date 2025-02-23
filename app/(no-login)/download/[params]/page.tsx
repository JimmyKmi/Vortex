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
  FileIcon,
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FileDown,
  FolderDown,
  Loader2
} from 'lucide-react'
import {Checkbox} from "@/components/ui/checkbox"
import React from 'react'
import {toast} from "sonner"
import {getApiErrorMessage} from "@/lib/utils/error-messages"
import {TransferInfo as TransferInfoType} from "@/types/transfer-session"
import {formatFileSize} from "@/lib/utils/file"
import {useTransferSession} from "@/hooks/useTransferSession"
import {Skeleton} from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {Shake} from "@/components/jimmy-ui/shake"
import {Progress} from "@/components/ui/progress"
import {TransferInfo} from "@/components/transfer-page/transfer-info"

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
interface DownloadTransferInfo extends TransferInfoType {
  status: 'DOWNLOADING' | 'COMPLETED';  // 下载只需要这两个状态
  type: 'DOWNLOAD';  // 限制类型为下载
  compressStatus: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';  // 压缩状态
  compressProgress: number;  // 压缩进度
}

export default function DownloadPage({params}: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const sessionId = resolvedParams.params
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [files, setFiles] = useState<DownloadFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCopied, setIsCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const {isActive, isValidating, transferInfo, setTransferInfo} = useTransferSession({sessionId})

  // 新增状态用于控制下载模式
  const [downloadMode, setDownloadMode] = useState<'single' | 'package'>('single')
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [showStructureWarning, setShowStructureWarning] = useState(false)

  // 修改进度相关状态
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState<string>('')
  const [showProgress, setShowProgress] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [compressPollingInterval, setCompressPollingInterval] = useState<NodeJS.Timeout | null>(null)

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
    if (sessionId && isActive) void fetchFileList()
  }, [sessionId, isActive])

  // 监听会话状态变化，当会话激活时获取文件列表
  useEffect(() => {
    if (isActive && !isValidating && transferInfo) void fetchFileList()
  }, [isActive, isValidating])

  // 修改初始选中状态
  useEffect(() => {
    if (files.length > 0) {
      const allFileIds = getAllFileIds(files)
      setSelectedFiles(new Set(allFileIds))
    }
  }, [files])

  // 修改进度条动画逻辑
  useEffect(() => {
    if (isDownloading && downloadMode === 'package') {
      // 打包模式下直接设置进度值，不使用动画
      setDownloadProgress(downloadProgress)
      return
    }
    // 原有单文件下载的动画逻辑保持不变...
  }, [isDownloading, downloadMode, downloadProgress])

  // 修改下载状态文本
  useEffect(() => {
    if (isDownloading && downloadMode === 'package') {
      // 打包模式下不自动更新状态文本，由接口返回的进度控制
      return
    }
    // 原有单文件下载的状态文本逻辑保持不变...
  }, [isDownloading, downloadMode, downloadProgress, downloadStatus])

  // 修改完成状态处理
  useEffect(() => {
    if (downloadProgress === 100 && downloadMode !== 'package') {  // 仅单文件模式根据进度设置完成状态
      setIsDownloading(false)
      setIsCompleted(true)
    }
  }, [downloadProgress, downloadMode])

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
          <TableCell className="text-right">{formatFileSize(file.sizeInBytes)}</TableCell>
        </TableRow>
        {isFolder && isExpanded && file.children?.map(child => renderFileItem(child, depth + 1))}
      </React.Fragment>
    )
  }

  // 获取实际选中的文件（不包括文件夹）
  const getActualSelectedFiles = (currentFiles: DownloadFile[]): DownloadFile[] => {
    const actualFiles: DownloadFile[] = []
    const traverse = (files: DownloadFile[]) => {
      files.forEach(file => {
        if (file.type === 'file' && selectedFiles.has(file.id)) actualFiles.push(file)
        if (file.type === 'folder' && file.children) traverse(file.children)
      })
    }
    traverse(currentFiles)
    return actualFiles
  }

  // 处理下载确认
  const handleDownloadConfirm = async () => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }

    try {
      const actualSelectedFiles = getActualSelectedFiles(files)

      // 打包下载模式下不检查选中文件数量
      if (downloadMode === 'single' && actualSelectedFiles.length === 0) {
        toast.error("请选择至少一个文件")
        return
      }

      setIsDownloading(true)
      setShowProgress(true)
      setDownloadProgress(0)
      setIsCompleted(false)

      if (downloadMode === 'package') {
        // 打包下载逻辑
        setDownloadStatus('正在准备打包下载...')
        toast.info("打包中...")
        // TODO: 实现打包下载逻辑
      } else {
        // 单文件下载逻辑
        const totalFiles = actualSelectedFiles.length
        let downloadedCount = 0

        // 分批处理文件，每批最多10个
        const batchSize = 10
        for (let batchIndex = 0; batchIndex < actualSelectedFiles.length; batchIndex += batchSize) {
          const batch = actualSelectedFiles.slice(batchIndex, batchIndex + batchSize)
          const batchFileNames = batch.map(f => f.name)

          try {
            // 更新状态显示
            setDownloadStatus(`正在生成 ${batchFileNames.join('、')}${batch.length < totalFiles ? '...' : ''}等 ${totalFiles} 个文件的下载通道`)

            // 获取下载URL
            const response = await axios.post(`/api/transfer-sessions/${sessionId}/download/generate-urls`, {
              files: batch.map(file => ({
                fileId: file.id,
                name: file.name
              }))
            })

            if (response.data.code !== "Success") throw new Error(getApiErrorMessage(response.data))

            // 开始下载文件
            setDownloadStatus(`正在下载 ${batchFileNames.join('、')}${batch.length < totalFiles ? '...' : ''} 等 ${totalFiles} 个文件`)
            const downloadUrls = response.data.data
            for (let fileIndex = 0; fileIndex < downloadUrls.length; fileIndex++) {
              const {url, filename} = downloadUrls[fileIndex]
              // 创建下载链接
              const link = document.createElement('a')
              link.href = url
              link.download = filename
              link.style.display = 'none'  // 隐藏链接
              document.body.appendChild(link)
              link.click()

              // 延迟移除链接，确保下载已经开始
              await new Promise(resolve => setTimeout(resolve, 100))
              document.body.removeChild(link)

              // 更新进度
              downloadedCount++
              setDownloadProgress(Math.round((downloadedCount / totalFiles) * 100))

              // 每个文件下载之间添加短暂延迟
              if (fileIndex < downloadUrls.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            }

          } catch (error: any) {
            console.error("Download batch error:", error)
            toast.error(`部分文件下载失败: ${error.message || "未知错误"}`)
          }

          // 每批下载之间稍微暂停一下，避免浏览器压力太大
          if (batchIndex + batchSize < actualSelectedFiles.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        setDownloadStatus('全部完成，请检查浏览器中文件下载进度')
        setIsCompleted(true)
        toast.success(`已开始下载 ${totalFiles} 个文件`)
      }
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error(getApiErrorMessage(error))
    } finally {
      setIsDownloading(false)
    }
  }

  /**
   * 处理压缩下载
   */
  const handleCompressDownload = async () => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }

    try {
      setIsDownloading(true)
      setShowProgress(true)
      setDownloadProgress(0)
      setIsCompleted(false)
      setDownloadStatus("正在建立通道...")

      const response = await axios.post(`/api/download/${sessionId}/compress-download`)

      if (response.data.code !== "Success") {
        toast.error(getApiErrorMessage(response.data))
        return
      }

      const {status, url, progress} = response.data.data

      if (status === "COMPLETED" && url) {
        setDownloadStatus("正在从缓存中下载，请从浏览器检查下载进度")
        setDownloadProgress(100)
        setIsCompleted(true)  // 在此处明确设置完成状态

        // 创建下载链接
        const link = document.createElement('a')
        link.href = url
        link.download = `${sessionId}.zip`  // 使用会话ID作为文件名
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else if (status === "PROCESSING") {
        // 根据进度显示不同阶段
        const phase = (progress || 0) >= 100 ? 2 : 1
        setDownloadStatus(
          `↻ （打包任务${phase}/2）${phase === 1 ? '正在打包...' : '正在建立缓存...'}`
        )
        setDownloadProgress(progress || 0)
        startCompressPolling()
      }

    } catch (error: any) {
      console.error("Compress download error:", error)
      toast.error(getApiErrorMessage(error))
    }
  }

  /**
   * 开始轮询压缩进度
   */
  const startCompressPolling = () => {
    // 清除已有的轮询
    if (compressPollingInterval) {
      clearInterval(compressPollingInterval)
    }

    // 创建新的轮询
    const interval = setInterval(async () => {
      try {
        const response = await axios.post(`/api/download/${sessionId}/compress-download`)

        if (response.data.code !== "Success") {
          clearInterval(interval)
          toast.error(getApiErrorMessage(response.data))
          return
        }

        const {status, url, progress} = response.data.data

        if (status === "COMPLETED" && url) {
          setDownloadStatus("正在从缓存中下载，请从浏览器检查下载进度")
          setDownloadProgress(100)
          setIsCompleted(true)  // 在此处明确设置完成状态

          // 创建下载链接
          const link = document.createElement('a')
          link.href = url
          link.download = `${sessionId}.zip`
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else if (status === "PROCESSING") {
          // 根据进度显示不同阶段
          const phase = (progress || 0) >= 100 ? 2 : 1
          setDownloadStatus(`（打包任务${phase}/2）${phase === 1 ? '正在打包...' : '正在建立缓存...'}`)
          setDownloadProgress(progress || 0)
        }

      } catch (error: any) {
        console.error("Poll compress status error:", error)
        clearInterval(interval)
        setCompressPollingInterval(null)
        toast.error(getApiErrorMessage(error))
      }
    }, 3000)  // 每 3 秒轮询一次

    setCompressPollingInterval(interval)
  }

  // 清理轮询
  useEffect(() => {
    return () => {
      if (compressPollingInterval) clearInterval(compressPollingInterval)
    }
  }, [compressPollingInterval])

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

  // 修改下载按钮点击处理逻辑
  const handleDownloadClick = (mode: 'single' | 'package') => {
    setDownloadMode(mode)

    // 如果是单文件模式，检查目录结构
    if (mode === 'single') {
      const hasNestedFiles = getActualSelectedFiles(files).some(file =>
        file.relativePath?.includes('/') || file.relativePath?.includes('\\')
      )

      if (hasNestedFiles) {
        setShowStructureWarning(true)
        return
      }
    }

    const allIds = getAllFileIds(files)
    const isFullSelection = selectedFiles.size === allIds.length
    const isNoSelection = selectedFiles.size === 0

    // 如果是打包模式，调用压缩下载
    if (mode === 'package') {
      if (isFullSelection || isNoSelection) {
        void handleCompressDownload()
      } else {
        setShowDownloadConfirm(true)
      }
      return
    }

    // 单文件模式下，如果是全选则直接下载，否则显示确认对话框
    if (isFullSelection) {
      void handleDownloadConfirm()
    } else {
      setShowDownloadConfirm(true)
    }
  }

  if (isValidating || !transferInfo) return (
    <Layout width="middle">
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">{isValidating ? "正在验证会话..." : "会话异常，请刷新重试"}</p>
      </div>
    </Layout>
  )

  return (
    <Layout width="middle" title="下载">
      <div className="space-y-4">
        <Title buttonType="back" title="下载"/>

        <TransferInfo transferInfo={transferInfo}/>

        {files.length === 0 && !isLoadingFiles ? (
          <div className="text-center text-muted-foreground py-8">暂无文件</div>
        ) : (
          <>
            {/* 修改进度条区域 */}
            {showProgress && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    {!isCompleted && (
                      <Loader2 className="h-4 w-4 animate-spin"/>
                    )}
                    <span className="text-muted-foreground">
                      {downloadStatus}
                      {downloadProgress < 100 &&
                        downloadMode === 'package' &&
                        downloadStatus !== '正在从缓存中下载，请从浏览器检查下载进度' &&
                        downloadStatus !== '正在准备打包下载...'}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {downloadStatus === '正在从缓存中下载，请从浏览器检查下载进度' ? '100' : downloadProgress}%
                  </span>
                </div>
                <Progress
                  value={downloadStatus === '正在从缓存中下载，请从浏览器检查下载进度' ? 100 : downloadProgress}
                  className="h-2"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-2 items-center bg-muted/50 p-2 rounded-lg">
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInvertSelection}
                  className="h-8"
                >反选</Button>
                <span className="text-sm text-muted-foreground">已选择 {getSelectedFilesCount(files)} 个文件</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={getActualSelectedFiles(files).length === 0 || isDownloading && downloadMode === 'single' || !!compressPollingInterval}
                  onClick={() => {
                    setDownloadMode('single')
                    handleDownloadClick('single')
                  }}
                  className="h-8 flex items-center gap-2"
                >
                  {(isDownloading && downloadMode === 'single') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  下载
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={files.length === 0 || (isDownloading && downloadMode === 'package') || !!compressPollingInterval}
                  onClick={() => {
                    setDownloadMode('package')
                    handleDownloadClick('package')
                  }}
                  className="h-8 flex items-center gap-2"
                >
                  {(isDownloading && downloadMode === 'package') || compressPollingInterval ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderDown className="h-4 w-4" />
                  )}
                  全部打包下载
                </Button>
              </div>
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

      {/* 下载路径提示 */}
      <Dialog open={showStructureWarning} onOpenChange={setShowStructureWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>下载路径提示</DialogTitle>
            <DialogDescription>
              你选择了目录中的文件，文件将会被<b><Shake>直接下载</Shake></b>，不会保留目录结构。如需保留完整目录结构，请选择打包下载。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowStructureWarning(false)}
            >取消</Button>
            <Button
              variant="default"
              onClick={() => {
                setShowStructureWarning(false)
                if (selectedFiles.size === getAllFileIds(files).length) {
                  void handleDownloadConfirm()
                } else {
                  setShowDownloadConfirm(true)
                }
              }}
            >继续下载</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 下载范围提示 */}
      <Dialog open={showDownloadConfirm} onOpenChange={setShowDownloadConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>下载范围提示</DialogTitle>
            <DialogDescription>
              {downloadMode === 'package'
                ? <>即将以<b><Shake>压缩包</Shake></b>的形式下载<b><Shake>全部</Shake></b>文件，要继续吗？</>
                : <>即将下载选中的文件，未选中的文件<b><Shake>不会被下载</Shake></b>。是否继续？</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadConfirm(false)}>取消</Button>
            <Button onClick={() => {
              setShowDownloadConfirm(false)
              void handleDownloadConfirm()
            }}>
              继续{downloadMode === 'package' ? '打包' : ''}下载
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
} 