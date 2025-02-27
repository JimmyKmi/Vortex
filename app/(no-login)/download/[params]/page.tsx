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

import {useEffect, useState, useCallback, use, useRef, useMemo} from 'react'
import Layout from '@/components/layout'
import axios from "axios"
import {Button} from "@/components/ui/button"
import {
  FileDown,
  FolderDown,
  Loader2
} from 'lucide-react'
import React from 'react'
import {toast} from "sonner"
import {getApiErrorMessage} from "@/lib/utils/error-messages"
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
import {useApi} from "@/hooks/useApi"
// 导入FileTree组件
import {FileTree, FileTreeRef} from "@/components/jimmy-ui/file-tree"

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

export default function DownloadPage({params}: PageProps) {
  const resolvedParams = use(params)
  const sessionId = resolvedParams.params
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [files, setFiles] = useState<DownloadFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const {isActive, isValidating, transferInfo, checkSessionActive} = useTransferSession({sessionId})
  const {call} = useApi() // 使用自定义API Hook
  const fileTreeRef = useRef<FileTreeRef>(null)
  // 添加ref跟踪文件列表是否已加载
  const hasLoadedFiles = useRef<boolean>(false)

  // 新增状态用于控制下载模式
  const [downloadMode, setDownloadMode] = useState<'single' | 'package' | null>(null)

  // 修改进度相关状态
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState<string>('')
  const [showProgress, setShowProgress] = useState(false)
  const [compressPollingInterval, setCompressPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // 在组件状态部分新增两个状态
  const [dialogPromiseResolve, setDialogPromiseResolve] = useState<((value: boolean) => void) | null>(null);
  const [currentDialogContent, setCurrentDialogContent] = useState<{
    title: string;
    description: React.ReactNode;
    confirmText?: string;
  } | null>(null);

  // 创建通用确认对话框方法
  const showConfirmDialog = (title: string, description: React.ReactNode, confirmText = "继续"): Promise<boolean> => {
    return new Promise((resolve) => {
      setCurrentDialogContent({title, description, confirmText})
      setDialogPromiseResolve(() => (result: boolean) => {
        setCurrentDialogContent(null)
        resolve(result)
      })
    })
  }

  /**
   * 获取文件列表
   */
  const fetchFileList = useCallback(async () => {
    if (!checkSessionActive()) return
    
    // 避免重复加载
    if (isLoadingFiles) return
    
    setIsLoadingFiles(true)
    
    try {
      const response = await call<DownloadFile[]>(
        axios.get(`/api/transfer-sessions/${sessionId}/download/file-list`),
        {
          errorMessage: "获取文件列表失败",
          showErrorToast: true
        }
      )
      
      if (response) {
        setFiles(response)
        hasLoadedFiles.current = true
      }
    } finally {
      setIsLoadingFiles(false)
    }
  }, [sessionId, checkSessionActive, call, isLoadingFiles]);

  // 初始加载文件列表 - 只在会话首次激活时加载一次
  useEffect(() => {
    if (sessionId && isActive && !hasLoadedFiles.current && !isLoadingFiles) {
      void fetchFileList();
    }
  }, [sessionId, isActive, fetchFileList, isLoadingFiles]);

  // 会话状态变化处理 - 只在会话从不活跃变为活跃时重新加载
  const prevIsActive = useRef<boolean>(false);
  useEffect(() => {
    // 只在从不活跃变为活跃时触发重新加载
    if (isActive && !prevIsActive.current && !isLoadingFiles) {
      void fetchFileList();
    }
    prevIsActive.current = isActive;
  }, [isActive, fetchFileList, isLoadingFiles]);

  useEffect(() => {
    // 修改进度条动画逻辑
    if (downloadMode === 'package') setDownloadProgress(downloadProgress)
  }, [downloadMode, downloadProgress])

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
   * 处理反选
   */
  const handleInvertSelection = () => {
    // 使用组件内置的反选方法
    fileTreeRef.current?.invertSelection();
  }

  /**
   * 选择状态变化回调
   */
  const handleSelectionChange = useCallback((newSelectedFiles: Set<string>) => {
    // 避免不必要的更新 - 只有当新旧集合不同时才更新
    setSelectedFiles(prev => {
      // 检查新旧集合是否相同
      if (prev.size !== newSelectedFiles.size) return newSelectedFiles;
      
      // 检查内容是否相同
      for (const id of prev) {
        if (!newSelectedFiles.has(id)) return newSelectedFiles;
      }
      
      // 如果集合大小和内容都相同，保持原状态
      return prev;
    });
  }, []);

  // 计算默认选中的文件，只在files变化时更新
  const computeDefaultSelectedFiles = useCallback(() => {
    // 递归获取所有文件和文件夹ID
    const getAllIds = (files: DownloadFile[]): string[] => {
      return files.reduce((acc: string[], file) => {
        // 同时选中文件和文件夹
        acc.push(file.id)
        
        if (file.type === 'folder' && file.children) {
          acc.push(...getAllIds(file.children))
        }
        return acc
      }, [])
    }
    
    return new Set(getAllIds(files));
  }, [files]);
  
  // 缓存默认选中的文件ID
  const defaultSelectedFiles = useMemo(() => {
    return computeDefaultSelectedFiles();
  }, [computeDefaultSelectedFiles]);

  /**
   * 获取实际选中的文件（不包括文件夹）
   */
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
   * 获取实际文件总数（不包括文件夹）
   */
  const getTotalFileCount = (currentFiles: DownloadFile[]): number => {
    return currentFiles.reduce((count, file) => {
      if (file.type === 'folder') return count + (file.children ? getTotalFileCount(file.children) : 0)
      return count + 1
    }, 0)
  }

  /**
   * 处理普通下载
   */
  const handleDefaultDownload = async () => {
    if (!checkSessionActive()) return
    
    try {
      const actualSelectedFiles = getActualSelectedFiles(files)

      setShowProgress(true)
      setDownloadProgress(0)

      // 单文件下载逻辑
      const totalFiles = actualSelectedFiles.length
      let downloadedCount = 0

      // 分批处理文件，每批最多10个
      const batchSize = 10
      for (let batchIndex = 0; batchIndex < actualSelectedFiles.length; batchIndex += batchSize) {
        const batch = actualSelectedFiles.slice(batchIndex, batchIndex + batchSize)
        const batchFileNames = batch.map(f => f.name)

        // 更新状态显示
        setDownloadStatus(`正在生成 ${batchFileNames.join('、')}${batch.length < totalFiles ? '...' : ''}等 ${totalFiles} 个文件的下载通道`)

        // 获取下载URL
        const downloadUrls = await call<{url: string, filename: string}[]>(
          axios.post(`/api/transfer-sessions/${sessionId}/download/generate-urls`, {
            files: batch.map(file => ({
              fileId: file.id,
              name: file.name
            }))
          }),
          {
            errorMessage: "生成下载链接失败",
            onError: () => console.error("下载URL生成失败")
          }
        )

        if (!downloadUrls || !downloadUrls.length) {
          toast.error(`部分文件下载失败: 无法获取下载链接`)
          continue // 继续下一批次的处理
        }

        // 开始下载文件
        setDownloadStatus(`正在下载 ${batchFileNames.join('、')}${batch.length < totalFiles ? '...' : ''} 等 ${totalFiles} 个文件`)
        
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
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        // 每批下载之间稍微暂停一下，避免浏览器压力太大
        if (batchIndex + batchSize < actualSelectedFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      setDownloadStatus('全部完成，请检查浏览器中文件下载进度')
      toast.success(`已开始下载 ${totalFiles} 个文件`)

    } catch (error: any) {
      console.error("Download error:", error)
      toast.error(getApiErrorMessage(error))
    } finally {
      setDownloadMode(null)
    }
  }

  /**
   * 开始轮询压缩进度
   */
  const startCompressPolling = useCallback(() => {
    if (!checkSessionActive()) return
    
    // 清除已有的轮询
    if (compressPollingInterval) {
      clearInterval(compressPollingInterval)
      setCompressPollingInterval(null)
    }

    // 定义压缩状态接口
    interface CompressionStatus {
      status: string;
      url?: string;
      progress?: number;
    }

    // 创建新的轮询
    const interval = setInterval(async () => {
      const compressionStatus = await call<CompressionStatus>(
        axios.post(`/api/transfer-sessions/${sessionId}/download/compress-download`),
        {
          errorMessage: "获取压缩状态失败",
          onError: () => {
            clearInterval(interval)
            setCompressPollingInterval(null)
          },
          showErrorToast: true
        }
      )

      if (!compressionStatus) return // 已在handleApiCall中处理错误

      const {status, url, progress} = compressionStatus

      if (status === "COMPLETED" && url) {
        setDownloadStatus("正在从缓存中下载，请从浏览器检查下载进度")
        setDownloadProgress(100)
        const link = document.createElement('a')
        link.href = url
        link.download = `${sessionId}.zip`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        clearInterval(interval)
        setCompressPollingInterval(null)
        setDownloadMode(null)  // 重置下载模式
      } else if (status === "PROCESSING") {
        const phase = (progress || 0) >= 100 ? 2 : 1
        setDownloadStatus(`（打包任务${phase}/2）${phase === 1 ? '正在打包...' : '正在建立缓存...'}`)
        setDownloadProgress(progress || 0)
      } else {
        // 如果状态既不是 COMPLETED 也不是 PROCESSING，说明可能出现了问题
        clearInterval(interval)
        setCompressPollingInterval(null)
        toast.error("压缩任务状态异常")
      }
    }, 3000)  // 每 3 秒轮询一次

    setCompressPollingInterval(interval)
  }, [sessionId, compressPollingInterval, call, checkSessionActive])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (compressPollingInterval) {
        clearInterval(compressPollingInterval)
        setCompressPollingInterval(null)
      }
    }
  }, [compressPollingInterval])

  /**
   * 处理压缩下载
   */
  const handleCompressDownload = async () => {
    if (!checkSessionActive()) return
    
    try {
      setShowProgress(true)
      setDownloadProgress(0)
      setDownloadStatus("正在建立通道...")
      startCompressPolling()
    } catch (error: any) {
      console.error("Compress download error:", error)
      toast.error(getApiErrorMessage(error))
      setDownloadMode(null) // 确保错误时重置下载模式
    }
  }

  /**
   * 下载按钮点击
   */
  const handleDownloadClick = async (mode: 'single' | 'package') => {
    if (!checkSessionActive()) return
    
    try {
      setDownloadMode(mode)
      setDownloadProgress(0)
      setDownloadStatus("")
      
      // 获取当前选中的文件
      const currentSelection = selectedFiles;
      
      // 获取所有的文件（不包括文件夹）
      const allFileIds = (() => {
        const getAllFileIdsHelper = (items: DownloadFile[]): string[] => {
          return items.reduce((acc: string[], item) => {
            if (item.type === 'file') {
              acc.push(item.id);
            } else if (item.type === 'folder' && item.children) {
              acc.push(...getAllFileIdsHelper(item.children));
            }
            return acc;
          }, []);
        };
        return getAllFileIdsHelper(files);
      })();
      
      // 检查是否全选了所有文件
      const isFullSelection = allFileIds.length > 0 && 
        allFileIds.every(id => currentSelection.has(id));
      
      // 检查是否一个文件都没选
      const isNoSelection = allFileIds.every(id => !currentSelection.has(id));

      switch (mode) {
        case 'single': {
          // 检查选中文件数量
          if (getActualSelectedFiles(files).length === 0) {
            toast.error("请选择至少一个文件")
            setDownloadMode(null)
            return
          }

          // 检查目录结构
          const hasNestedFiles = getActualSelectedFiles(files).some(file =>
            file.relativePath?.includes('/') || file.relativePath?.includes('\\')
          )

          // 显示结构警告对话框
          if (hasNestedFiles) {
            const confirm = await showConfirmDialog(
              '下载路径提示',
              <>你选择了目录中的文件，文件将会被<b><Shake>直接下载</Shake></b>，不会保留目录结构。如需保留完整目录结构，请选择打包下载。</>,
              '直接下载')
            if (!confirm) {
              setDownloadMode(null)
              return
            }
          }

          // 处理下载范围确认
          if (!isFullSelection) {
            const confirm = await showConfirmDialog(
              '下载范围提示',
              <>即将下载选中的文件，未选中的文件<b><Shake>不会被下载</Shake></b>。是否继续？</>,
              '继续')
            if (!confirm) {
              setDownloadMode(null)
              return
            }
          }

          await handleDefaultDownload()
          break
        }

        case 'package': {
          // 处理打包下载确认
          if (!isFullSelection && !isNoSelection) {
            const confirm = await showConfirmDialog(
              '下载范围提示',
              <>即将以<b><Shake>压缩包</Shake></b>的形式下载<b><Shake>全部</Shake></b>文件，要继续吗？</>,
              '打包下载')
            if (!confirm) {
              setDownloadMode(null)
              return
            }
          }

          await handleCompressDownload()
          break
        }
      }
    } catch (error) {
      console.error("Download process error:", error)
      toast.error(getApiErrorMessage(error))
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
    <Layout width="middle" title="下载" buttonType="back">
      <TransferInfo transferInfo={transferInfo}/>
      {files.length === 0 && !isLoadingFiles ? (
        <div className="text-center text-muted-foreground py-8">暂无文件</div>
      ) : (
        <>
          {/* 进度条区域 */}
          {showProgress && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  {downloadMode && <Loader2 className="h-4 w-4 animate-spin"/>}
                  <span className="text-muted-foreground">{downloadStatus}</span>
                </div>
                <span className="text-muted-foreground">{downloadProgress}%</span>
              </div>
              <Progress
                className={`transition-all duration-700 ${downloadMode ? "h-3 opacity-100" : "h-1 opacity-50"}`}
                value={downloadProgress}/>
            </div>
          )}

          <div className="flex flex-col-reverse items-stretch sm:flex-row justify-between gap-2 bg-muted/50 p-2 rounded-lg">
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={handleInvertSelection} className="h-8">反选</Button>
              <span
                className="text-sm text-muted-foreground">共 {getTotalFileCount(files)} 个文件，已选择 {getSelectedFilesCount(files)} 个</span>
            </div>
            <div className="flex flex-row gap-2">
              <Button variant="default" size="sm" className="h-8 flex items-center gap-2 flex-1"
                      disabled={getActualSelectedFiles(files).length === 0 || !!downloadMode}
                      onClick={() => {
                        void handleDownloadClick('single')
                      }}>
                {(downloadMode === 'single') ?
                  (<Loader2 className="h-4 w-4 animate-spin"/>) :
                  <FileDown className="h-4 w-4"/>} 下载
              </Button>
              <Button variant="default" size="sm" className="h-8 flex items-center gap-2 flex-1"
                      disabled={files.length === 0 || !!downloadMode}
                      onClick={() => {
                        void handleDownloadClick('package')
                      }}>
                {(downloadMode === 'package') ?
                  <Loader2 className="h-4 w-4 animate-spin"/> :
                  <FolderDown className="h-4 w-4"/>} 全部打包下载
              </Button>
            </div>
          </div>

          {isLoadingFiles ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-[300px]" />
                </div>
              ))}
            </div>
          ) : (
            <FileTree
              ref={fileTreeRef}
              files={files}
              mode="uncontrolled"
              defaultSelectedFiles={defaultSelectedFiles}
              onSelectionChange={handleSelectionChange}
              disabled={!!downloadMode}
            />
          )}
        </>
      )}

      {/* 通用确认对话框 */}
      <Dialog open={!!currentDialogContent} onOpenChange={(open) => {
        if (!open && dialogPromiseResolve) dialogPromiseResolve(false)
      }}>
        <DialogContent>
          {currentDialogContent && (
            <>
              <DialogHeader>
                <DialogTitle>{currentDialogContent.title}</DialogTitle>
                <DialogDescription>
                  {currentDialogContent.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => dialogPromiseResolve?.(false)}>
                  取消
                </Button>
                <Button
                  variant="default"
                  onClick={() => dialogPromiseResolve?.(true)}
                >
                  {currentDialogContent.confirmText}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  )
} 