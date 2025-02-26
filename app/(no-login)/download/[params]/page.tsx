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

import {useEffect, useState, useCallback, use} from 'react'
import Layout from '@/components/layout'
import axios from "axios"
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

/**
 * 统一的API响应处理函数
 * @param apiCall - API调用函数
 * @param options - 选项配置
 * @returns 处理后的响应数据或抛出错误
 */
interface ApiCallOptions {
  errorMessage?: string; // 自定义错误消息
  showErrorToast?: boolean; // 是否显示错误提示
  onSuccess?: (data: any) => void; // 成功回调
  onError?: (error: any) => void; // 错误回调
  finallyAction?: () => void; // 最终执行的操作
}

const handleApiCall = async <T,>(
  apiCall: Promise<any>,
  options: ApiCallOptions = {}
): Promise<T | null> => {
  const {
    errorMessage,
    showErrorToast = true,
    onSuccess,
    onError,
    finallyAction
  } = options;

  try {
    const response = await apiCall;
    
    if (response.data.code !== "Success") {
      const apiError = new Error(getApiErrorMessage(response.data));
      apiError.name = response.data.code || "ApiError";
      
      if (showErrorToast) {
        toast.error(errorMessage || getApiErrorMessage(response.data));
      }
      
      if (onError) {
        onError(apiError);
      }
      
      return null;
    }
    
    if (onSuccess) {
      onSuccess(response.data.data);
    }
    
    return response.data.data as T;
  } catch (error: any) {
    console.error("API call error:", error);
    
    if (showErrorToast) {
      toast.error(errorMessage || getApiErrorMessage(error));
    }
    
    if (onError) {
      onError(error);
    }
    
    return null;
  } finally {
    if (finallyAction) {
      finallyAction();
    }
  }
};

export default function DownloadPage({params}: PageProps) {
  const resolvedParams = use(params)
  const sessionId = resolvedParams.params
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [files, setFiles] = useState<DownloadFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const {isActive, isValidating, transferInfo} = useTransferSession({sessionId})

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
      setCurrentDialogContent({title, description, confirmText});
      setDialogPromiseResolve(() => (result: boolean) => {
        setCurrentDialogContent(null);
        resolve(result);
      });
    });
  };

  /**
   * 获取文件列表
   */
  const fetchFileList = async () => {
    setIsLoadingFiles(true);
    
    await handleApiCall<DownloadFile[]>(
      axios.get(`/api/transfer-sessions/${sessionId}/download/file-list`),
      {
        errorMessage: "获取文件列表失败",
        onSuccess: (data) => setFiles(data),
        finallyAction: () => setIsLoadingFiles(false)
      }
    );
  };

  useEffect(() => {
    // 初始化加载
    if (sessionId && isActive) void fetchFileList()
    // 监听会话状态变化，当会话激活时获取文件列表
    if (isActive && !isValidating && transferInfo) void fetchFileList()
  }, [sessionId, isActive, isValidating])

  // 修改初始选中状态
  useEffect(() => {
    if (files.length > 0) {
      const allFileIds = getAllFileIds(files)
      setSelectedFiles(new Set(allFileIds))
    }
  }, [files])

  useEffect(() => {
    // 修改进度条动画逻辑
    if (downloadMode === 'package') setDownloadProgress(downloadProgress)
  }, [downloadMode, downloadProgress])

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
    return folder.children?.reduce((ids: string[], child) => {
      ids.push(child.id)
      if (child.type === 'folder') ids.push(...getFolderChildrenIds(child))
      return ids
    }, []) || []
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
   * 处理全选
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
   * 获取实际文件总数（不包括文件夹）
   */
  const getTotalFileCount = (currentFiles: DownloadFile[]): number => {
    return currentFiles.reduce((count, file) => {
      if (file.type === 'folder') return count + (file.children ? getTotalFileCount(file.children) : 0)
      return count + 1
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

  /**
   * 处理普通下载
   */
  const handleDefaultDownload = async () => {
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
        const downloadUrls = await handleApiCall<{url: string, filename: string}[]>(
          axios.post(`/api/transfer-sessions/${sessionId}/download/generate-urls`, {
            files: batch.map(file => ({
              fileId: file.id,
              name: file.name
            }))
          }),
          {
            errorMessage: "生成下载链接失败",
            onError: () => {
              console.error("Failed to generate download URLs for batch")
            }
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
    // 清除已有的轮询
    if (compressPollingInterval) {
      clearInterval(compressPollingInterval);
      setCompressPollingInterval(null);
    }

    // 定义压缩状态接口
    interface CompressionStatus {
      status: string;
      url?: string;
      progress?: number;
    }

    // 创建新的轮询
    const interval = setInterval(async () => {
      const compressionStatus = await handleApiCall<CompressionStatus>(
        axios.post(`/api/transfer-sessions/${sessionId}/download/compress-download`),
        {
          errorMessage: "获取压缩状态失败",
          onError: () => {
            clearInterval(interval);
            setCompressPollingInterval(null);
          },
          showErrorToast: true
        }
      );

      if (!compressionStatus) {
        return; // 已在handleApiCall中处理错误
      }

      const {status, url, progress} = compressionStatus;

      if (status === "COMPLETED" && url) {
        setDownloadStatus("正在从缓存中下载，请从浏览器检查下载进度");
        setDownloadProgress(100);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sessionId}.zip`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        clearInterval(interval);
        setCompressPollingInterval(null);
        setDownloadMode(null);  // 重置下载模式
      } else if (status === "PROCESSING") {
        const phase = (progress || 0) >= 100 ? 2 : 1;
        setDownloadStatus(`（打包任务${phase}/2）${phase === 1 ? '正在打包...' : '正在建立缓存...'}`)
        setDownloadProgress(progress || 0);
      } else {
        // 如果状态既不是 COMPLETED 也不是 PROCESSING，说明可能出现了问题
        clearInterval(interval);
        setCompressPollingInterval(null);
        toast.error("压缩任务状态异常");
      }
    }, 3000);  // 每 3 秒轮询一次

    setCompressPollingInterval(interval);
  }, [sessionId, compressPollingInterval]);

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (compressPollingInterval) {
        clearInterval(compressPollingInterval);
        setCompressPollingInterval(null);
      }
    };
  }, [compressPollingInterval]);

  /**
   * 处理压缩下载
   */
  const handleCompressDownload = async () => {
    try {
      setShowProgress(true);
      setDownloadProgress(0);
      setDownloadStatus("正在建立通道...");
      startCompressPolling();
    } catch (error: any) {
      console.error("Compress download error:", error);
      toast.error(getApiErrorMessage(error));
      setDownloadMode(null); // 确保错误时重置下载模式
    }
  };

  // 渲染骨架屏
  const renderSkeleton = () => {
    return (
      <React.Fragment>
        {[1, 2, 3].map((i) => (
          <TableRow key={i}>
            <TableCell className="w-[40px]">
              <Skeleton className="h-5 w-5"/>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5"/>
                <Skeleton className="h-5 w-[200px]"/>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-5 w-[60px] ml-auto"/>
            </TableCell>
          </TableRow>
        ))}
      </React.Fragment>
    )
  }

  // 下载按钮点击
  const handleDownloadClick = async (mode: 'single' | 'package') => {
    try {
      setDownloadMode(mode);
      setDownloadProgress(0)
      setDownloadStatus("")
      const isFullSelection = selectedFiles.size === getAllFileIds(files).length;
      const isNoSelection = selectedFiles.size === 0;

      switch (mode) {
        case 'single': {

          // 检查选中文件数量
          if (getActualSelectedFiles(files).length === 0) {
            toast.error("请选择至少一个文件")
            setDownloadMode(null);
            return
          }

          // 检查目录结构
          const hasNestedFiles = getActualSelectedFiles(files).some(file =>
            file.relativePath?.includes('/') || file.relativePath?.includes('\\')
          );

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
      console.error("Download process error:", error);
      toast.error(getApiErrorMessage(error));
    }
  };

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

      {/* 通用确认对话框 */}
      <Dialog open={!!currentDialogContent} onOpenChange={(open) => {
        if (!open && dialogPromiseResolve) {
          dialogPromiseResolve(false);
        }
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