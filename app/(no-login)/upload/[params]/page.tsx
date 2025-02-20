/**
 * 文件上传页面组件
 *
 * 主要功能：
 * - 支持单文件和文件夹上传
 * - 支持拖拽上传
 * - 支持多文件并发上传
 * - 显示上传进度
 * - 文件夹层级展示和管理
 */

'use client'

interface PageProps {
  params: Promise<{
    params: string;
  }>;
  searchParams: { [key: string]: string | string[] | undefined };
}

import {useEffect, useState, useCallback, use} from 'react'
import {useRouter} from 'next/navigation'
import Layout from '@/components/layout'
import axios, {AxiosRequestConfig, AxiosProgressEvent} from "axios"
import {Title} from "@/components/title"
import {Button} from "@/components/ui/button"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {
  Upload, FileIcon, ChevronRight, ChevronDown, FolderIcon, Copy, Clock, Calendar, Hash, User, Plus, Trash2
} from 'lucide-react'
import {Checkbox} from "@/components/ui/checkbox"
import React from 'react'
import {toast} from "sonner"
import UploadConfigure from './configure'
import UploadComplete from './complete'
import {useDragDrop} from '@/contexts/drag-drop-context'
import {getApiErrorMessage} from "@/lib/utils/error-messages"
import {TransferInfo} from "@/types/transfer-session"
import {formatFileSize} from "@/lib/utils/file"
import {useTransferSession} from "@/hooks/useTransferSession"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {Shake} from '@/components/jimmy-ui/shake'

interface FileError {
  stage: 'preparing' | 'uploading' | 'verifying';
  message: string;
  retryCount: number;
  lastError?: Error;
}

/**
 * 待上传文件的数据结构
 *
 * @interface FileToUpload
 * @property {string} id - 唯一标识符
 * @property {string} name - 文件/文件夹名称
 * @property {string} size - 格式化后的文件大小
 * @property {number} sizeInBytes - 文件大小（字节）
 * @property {'file' | 'folder'} type - 文件类型
 * @property {FileToUpload[]} [children] - 文件夹子项
 * @property {string} [relativePath] - 相对路径
 * @property {File} [file] - 原始文件对象
 * @property {'not_started' | 'preparing' | 'uploading' | 'verifying' | 'completed'} [status] - 上传状态
 * @property {number} [progress] - 上传进度（0-100）
 * @property {number} [uploadedSize] - 已上传大小（字节）
 * @property {boolean} [selected] - 新增选中状态
 */
interface FileToUpload {
  id: string;
  name: string;
  size: string;
  sizeInBytes: number;
  type: 'file' | 'folder';
  children?: FileToUpload[];
  relativePath?: string;
  file?: File;
  status?: 'not_started' | 'preparing' | 'uploading' | 'verifying' | 'completed' |
    'error_preparing' | 'error_uploading' | 'error_verifying' | 'retrying';
  progress?: number;
  uploadedSize?: number;
  selected?: boolean;
  error?: FileError;
  retryCount?: number;
}

/**
 * 重试配置
 */
const retryConfig = {
  maxRetries: 6,
  retryDelay: 1000,
  exponentialBackoff: true,
  stages: {
    preparing: {maxRetries: 3, retryDelay: 2000},
    uploading: {maxRetries: 5, retryDelay: 2000},
    verifying: {maxRetries: 6, retryDelay: 2000}
  }
};
/**
 * 更新文件列表中指定文件的状态
 *
 * @param {FileToUpload[]} files - 原文件列表
 * @param {string} fileId - 要更新的文件ID
 * @param {Partial<FileToUpload>} updates - 更新的属性
 * @returns {FileToUpload[]} 更新后的文件列表
 */
const updateFileInList = (
  files: FileToUpload[],
  fileId: string,
  updates: Partial<FileToUpload>
): FileToUpload[] => {
  return files.map(f => {
    if (f.id === fileId) return {...f, ...updates}
    if (f.type === 'folder' && f.children) {
      return {...f, children: updateFileInList(f.children, fileId, updates)}
    }
    return f
  })
}

/**
 * 生成上传URL的通用函数
 *
 * @param {Object} params - 请求参数
 * @param {string} params.name - 文件名
 * @param {string} params.relativePath - 相对路径
 * @param {boolean} params.isDirectory - 是否为目录
 * @param {string} [params.parentId] - 父文件夹ID
 * @param {string} [params.mimeType] - 文件类型
 * @param {number} [params.size] - 文件大小
 * @param {string} sessionId - 会话ID
 * @returns {Promise<{uploadUrl: string, uploadFields: Record<string, string>, s3BasePath: string, uploadToken: string, id: string}>}
 */
const generateUploadUrl = async (params: {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  mimeType?: string;
  size?: number;
}, sessionId: string): Promise<{
  uploadUrl: string;
  uploadFields: Record<string, string>;
  s3BasePath: string;
  uploadToken: string;
  id: string
}> => {
  try {
    const response = await axios.post(
      '/api/files/upload/generate-upload-url', params, {params: {sessionId}});
    if (response.data.code !== 'Success') throw new Error(getApiErrorMessage(response.data));
    return response.data.data;
  } catch (error: any) {
    console.error('Generate upload URL error:', {
      error,
      params,
      message: error?.message,
      response: error?.response?.data
    });
    throw new Error(error?.response?.data?.message || error?.message || '获取上传URL失败');
  }
};

export default function UploadPage({params}: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const sessionId = resolvedParams.params
  const [isValidating, setIsValidating] = useState(true) // 是否正在验证传输码
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null)
  const [files, setFiles] = useState<FileToUpload[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set()) // 新增选中文件集合
  const [isUploading, setIsUploading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCopied, setIsCopied] = useState(false)
  const {enableDragDrop, disableDragDrop} = useDragDrop()
  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const {isActive} = useTransferSession({sessionId})

  /**
   * 获取传输码详细信息
   * 包括：基本信息和会话状态
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
  useEffect(() => {
    if (sessionId) fetchTransferInfo().then()
  }, [sessionId])

  // 监听状态变化，确保状态更新完成后再刷新页面
  useEffect(() => {
    if (transferInfo?.status === "CONFIGURING") router.refresh()
  }, [transferInfo?.status, router])

  /**
   * 检查文件是否重复
   *
   * @param {string} filePath - 文件路径
   * @param {FileToUpload[]} existingFiles - 现有文件列表
   * @param {FileToUpload[]} newFiles - 新文件列表
   * @returns {boolean} 是否重复
   */
  const isFileDuplicate = useCallback((filePath: string, existingFiles: FileToUpload[], newFiles: FileToUpload[] = []): boolean => {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()

    // 检查已存在的文件
    const checkDuplicate = (files: FileToUpload[]): boolean => {
      return files.some(file => {
        const currentPath = (file.relativePath || file.name).replace(/\\/g, '/').toLowerCase()
        if (file.type === 'file') return currentPath === normalizedPath
        if (file.type === 'folder') return currentPath === normalizedPath ||
          (file.children && normalizedPath.startsWith(currentPath + '/') && checkDuplicate(file.children))
        return false
      })
    }

    return checkDuplicate(existingFiles) || (newFiles.length > 0 && checkDuplicate(newFiles))
  }, [])

  /**
   * 处理文件添加
   *
   * 主要流程：
   * 1. 检查文件重复
   * 2. 构建文件夹树结构
   * 3. 更新文件夹大小
   *
   * @param {File[]} files - 文件列表
   */
  const processAddFiles = useCallback(async (files: File[]) => {
    try {
      const newFiles: FileToUpload[] = []
      const duplicates: string[] = []
      const processedPaths = new Set<string>()
      const currentFiles = await new Promise<FileToUpload[]>(resolve => {
        setFiles(prev => {
          resolve(prev)
          return prev
        })
      })

      // 构建文件夹树结构
      const folderTree: { [key: string]: FileToUpload } = {}

      // 初始化现有的文件夹树结构
      const initExistingFolderTree = (files: FileToUpload[]) => {
        files.forEach(file => {
          if (file.type === 'folder' && file.relativePath) {
            folderTree[file.relativePath] = file
            if (file.children) initExistingFolderTree(file.children)
          }
        })
      }
      initExistingFolderTree(currentFiles)

      /**
       * 更新文件夹大小的递归函数
       *
       * @param {FileToUpload} folder - 文件夹对象
       * @returns {number} 文件夹总大小
       */
      const updateFolderSize = (folder: FileToUpload): number => {
        if (!folder.children) return 0
        const totalSize = folder.children.reduce((sum, item) => {
          return sum + (item.type === 'file' ? item.sizeInBytes : updateFolderSize(item))
        }, 0)
        folder.sizeInBytes = totalSize
        folder.size = formatFileSize(totalSize)
        return totalSize
      }

      // 处理每个文件
      for (const file of files) {
        const filePath = (file as any).webkitRelativePath || file.name
        const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()

        // 如果文件已经处理过，则跳过
        if (processedPaths.has(normalizedPath)) {
          duplicates.push(filePath)
          continue
        }

        // 检查文件是否重复
        if (isFileDuplicate(filePath, currentFiles, newFiles)) {
          duplicates.push(filePath)
          continue
        }

        // 分割路径
        const pathParts = filePath.split(/[/\\]/)
        const fileName = pathParts[pathParts.length - 1]

        // 如果是单个文件（没有相对路径）
        if (pathParts.length === 1) {
          newFiles.push({
            id: crypto.randomUUID(),
            name: fileName,
            size: formatFileSize(file.size),
            sizeInBytes: file.size,
            type: 'file',
            relativePath: fileName,
            file
          })
          processedPaths.add(normalizedPath)
          continue
        }

        // 处理文件夹结构
        let currentPath = ''
        let parentFolder: FileToUpload | null = null

        // 遍历路径部分，创建或获取文件夹结构
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderName = pathParts[i]
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

          if (!folderTree[currentPath]) {
            // 创建新文件夹
            const newFolder: FileToUpload = {
              id: crypto.randomUUID(),
              name: folderName,
              size: '0 KB',
              sizeInBytes: 0,
              type: 'folder',
              relativePath: currentPath,
              children: []
            }
            folderTree[currentPath] = newFolder
            parentFolder ? parentFolder.children!.push(newFolder) : newFiles.push(newFolder)
          }
          parentFolder = folderTree[currentPath]
        }

        // 创建文件对象并添加到最后一个文件夹
        const newFile: FileToUpload = {
          id: crypto.randomUUID(),
          name: fileName,
          size: formatFileSize(file.size),
          sizeInBytes: file.size,
          type: 'file',
          relativePath: filePath,
          file
        }
        parentFolder ? parentFolder.children!.push(newFile) : newFiles.push(newFile)
        processedPaths.add(normalizedPath)
      }

      // 更新所有顶层文件夹的大小
      const updateAllFolderSizes = (files: FileToUpload[]) => {
        files.forEach(file => {
          if (file.type === 'folder') updateFolderSize(file)
        })
      }
      updateAllFolderSizes(currentFiles)
      updateAllFolderSizes(newFiles)

      // 合并新文件到现有结构
      const mergeFiles = (existingFiles: FileToUpload[], newFilesToAdd: FileToUpload[]): FileToUpload[] => {
        const result = [...existingFiles]

        newFilesToAdd.forEach(newFile => {
          const existingFileIndex = result.findIndex(existing =>
            existing.type === 'folder' &&
            existing.relativePath === newFile.relativePath
          )

          if (existingFileIndex !== -1 && newFile.type === 'folder') {
            // 如果文件夹已存在，合并子项
            const existingFolder = result[existingFileIndex]
            existingFolder.children = mergeFiles(
              existingFolder.children || [],
              newFile.children || []
            )
            updateFolderSize(existingFolder)
          } else {
            // 如果是新文件或新文件夹，直接添加
            result.push(newFile)
          }
        })

        return result
      }

      // 处理完成后，根据processedPaths的大小显示成功提示
      if (processedPaths.size > 0) {
        setFiles(prev => mergeFiles(prev, newFiles))
        toast.success(`成功添加 ${processedPaths.size} 个文件`)
      }

      // 重复文件的提示
      if (duplicates.length > 0) {
        toast.error(`${duplicates.length} 个文件已存在，已自动跳过：\n${duplicates.join('、')}`)
      }

    } catch (error) {
      console.error('处理文件添加时发生错误:', error)
      toast.error('添加文件时发生错误')
    }
  }, [isFileDuplicate])

  /**
   * 处理文件上传的主方法
   *
   * 主要流程：
   * 1. 验证会话状态
   * 2. 检查是否有文件
   * 3. 设置初始上传状态
   * 4. 展平文件列表
   * 5. 并发上传文件
   * 6. 处理上传完成后的状态更新
   */
  const handleUpload = async () => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }

    if (files.length === 0) {
      toast.error("请先选择要上传的文件")
      return
    }

    setIsUploading(true)
    let hasError = false

    try {
      // 开始上传，获取下载码
      const startResponse = await axios.post(`/api/transfer-sessions/${sessionId}/upload/start`)
      if (startResponse.data.code !== "Success") {
        if (startResponse.data.code === "AlreadyStarted") {
          // 如果已经开始上传，继续执行
          console.log("Upload already started, continuing...")
        } else {
          throw new Error(getApiErrorMessage(startResponse.data))
        }
      }

      // 设置所有文件的初始状态为等待
      setFiles(prev => {
        const setInitialStatus = (files: FileToUpload[]): FileToUpload[] => {
          return files.map(f => ({
            ...f,
            status: 'not_started',
            progress: 0,
            children: f.children ? setInitialStatus(f.children) : undefined
          }))
        }
        return setInitialStatus(prev)
      })

      // 新的展平文件方法（仅获取文件）
      const flattenFiles = (files: FileToUpload[]): FileToUpload[] => {
        const allFiles: FileToUpload[] = [];
        const traverse = (items: FileToUpload[]) => {
          items.forEach(item => {
            allFiles.push(item);
            if (item.children) traverse(item.children);
          });
        };
        traverse(files);
        return allFiles;
      };

      const allFiles = flattenFiles(files);

      // 创建一个函数来处理单个文件的上传
      const processUpload = async (file: FileToUpload) => {
        const retryUpload = async (stage: 'preparing' | 'uploading' | 'verifying', error: any): Promise<boolean> => {
          const stageConfig = retryConfig.stages[stage];
          const currentRetryCount = (file.error?.retryCount || 0) + 1;

          if (currentRetryCount > stageConfig.maxRetries) return false;

          // 更新状态为重试中
          setFiles(prev => updateFileInList(prev, file.id, {
            status: 'retrying',
            error: {
              stage,
              message: error?.response?.data?.message || error?.message || `${stage}阶段失败`,
              retryCount: currentRetryCount,
              lastError: error
            }
          }));

          // 计算延迟时间
          const delay = retryConfig.exponentialBackoff
            ? stageConfig.retryDelay * Math.pow(2, currentRetryCount - 1)
            : stageConfig.retryDelay;

          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, delay));
          return true;
        };

        try {
          // 先处理文件夹创建
          if (file.type === 'folder') {
            const folderData = await generateUploadUrl({
              name: file.name,
              relativePath: file.relativePath || '',
              isDirectory: true,
              mimeType: 'inode/directory',
              size: 0
            }, sessionId);
            
            // 更新文件夹状态
            setFiles(prev => updateFileInList(prev, file.id, {
              status: 'completed',
              progress: 100
            }));
            return;
          }

          // 更新文件状态为准备中
          setFiles(prev => updateFileInList(prev, file.id, {
            status: 'preparing',
            progress: 0,
            error: undefined
          }))

          let uploadData;
          while (true) {
            try {
              uploadData = await generateUploadUrl({
                name: file.name,
                mimeType: file.file?.type || 'application/octet-stream',
                size: file.file?.size || 0,
                relativePath: file.relativePath || '',
                isDirectory: false,
              }, sessionId);
              break;
            } catch (error: any) {
              const canRetry = await retryUpload('preparing', error);
              if (!canRetry) {
                setFiles(prev => updateFileInList(prev, file.id, {
                  status: 'error_preparing',
                  error: {
                    stage: 'preparing',
                    message: error?.response?.data?.message || error?.message || '准备上传失败',
                    retryCount: (file.error?.retryCount || 0) + 1,
                    lastError: error
                  }
                }));
                throw error;
              }
            }
          }

          // 更新文件状态为上传中
          setFiles(prev => updateFileInList(prev, file.id, {
            status: 'uploading',
            progress: 0,
            error: undefined
          }))

          while (true) {
            try {
              const formData = new FormData()
              Object.entries(uploadData.uploadFields).forEach(([key, value]) => {
                formData.append(key, value as string)
              })
              formData.append('file', file.file!)

              await axios.post(uploadData.uploadUrl, formData, {
                headers: {'Content-Type': 'multipart/form-data'},
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 0,
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
                  setFiles(prev => updateFileInList(prev, file.id, {
                    progress: percentCompleted,
                    uploadedSize: progressEvent.loaded
                  }))
                }
              } as AxiosRequestConfig)
              break;
            } catch (error: any) {
              const canRetry = await retryUpload('uploading', error);
              if (!canRetry) {
                setFiles(prev => updateFileInList(prev, file.id, {
                  status: 'error_uploading',
                  error: {
                    stage: 'uploading',
                    message: error?.response?.data?.message || error?.message || '文件上传失败',
                    retryCount: (file.error?.retryCount || 0) + 1,
                    lastError: error
                  }
                }));
                throw error;
              }
            }
          }

          // 更新文件状态为校验中
          setFiles(prev => updateFileInList(prev, file.id, {
            status: 'verifying',
            progress: 100,
            error: undefined
          }))

          while (true) {
            try {
              // 记录上传
              await axios.post('/api/files/upload/record', {
                name: file.name,
                mimeType: file.file?.type || 'application/octet-stream',
                size: file.file?.size || 0,
                relativePath: file.relativePath || '',
                isDirectory: false,
                s3BasePath: uploadData.s3BasePath,
                uploadToken: uploadData.uploadToken,
                userId: transferInfo!.createdBy || undefined
              }, {
                params: {sessionId}
              })
              break;
            } catch (error: any) {
              const canRetry = await retryUpload('verifying', error);
              if (!canRetry) {
                setFiles(prev => updateFileInList(prev, file.id, {
                  status: 'error_verifying',
                  error: {
                    stage: 'verifying',
                    message: error?.response?.data?.message || error?.message || '记录上传失败',
                    retryCount: (file.error?.retryCount || 0) + 1,
                    lastError: error
                  }
                }));
                throw error;
              }
            }
          }

          // 更新文件状态为完成
          setFiles(prev => updateFileInList(prev, file.id, {
            status: 'completed',
            progress: 100,
            error: undefined
          }))
        } catch (error: any) {
          console.error('Process upload error for file:', {
            error,
            file: file.name,
            message: error?.message,
            response: error?.response?.data
          });
          hasError = true;
          toast.error(`上传 ${file.name} 失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
        }
      }

      const uploadQueue = [...allFiles]
      const maxConcurrent = 3
      const activeUploads = new Set<Promise<void>>()

      // 创建一个函数来启动新的上传任务
      const startNextUpload = async () => {
        if (hasError || uploadQueue.length === 0) return

        const file = uploadQueue.shift()!
        const uploadPromise = processUpload(file).finally(() => {
          activeUploads.delete(uploadPromise)
          if (!hasError) startNextUpload()
        })
        activeUploads.add(uploadPromise)
      }

      // 初始启动最多 maxConcurrent 个上传任务
      const initialUploads = Math.min(maxConcurrent, uploadQueue.length)
      for (let i = 0; i < initialUploads; i++) {
        await startNextUpload()
      }

      // 等待所有上传任务完成
      while (activeUploads.size > 0) {
        await Promise.race(Array.from(activeUploads))
        if (hasError) break
      }

      if (!hasError) {
        const completeResponse = await axios.post(`/api/transfer-sessions/${sessionId}/upload/complete`)
        if (completeResponse.data.code !== 'Success') throw new Error(getApiErrorMessage(completeResponse.data))

        // 更新传输信息状态
        setTransferInfo(prev => ({
          ...prev!,
          status: "CONFIGURING",
          downloadCode: completeResponse.data.data.downloadCode
        }))

        toast.success("所有文件上传成功！")

        // 等待状态更新完成后再刷新页面
        await new Promise(resolve => setTimeout(resolve, 500))
        router.refresh()
      }
    } catch (error: any) {
      console.error('Upload process error:', error)
      toast.error(error.message || "上传过程中发生错误")
    } finally {
      if (hasError) setIsUploading(false)
    }
  }

  /**
   * 复制传输码到剪贴板
   */
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(transferInfo?.code || '')
      setIsCopied(true)
      toast.success("传输码已复制到剪贴板")
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error("复制失败，请手动复制")
    }
  }

  /**
   * 切换文件夹展开/折叠状态
   *
   * @param {string} folderId - 文件夹ID
   */
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId)
      return newSet
    })
  }

  /**
   * 处理文件选择事件
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - 文件选择事件
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }
    try {
      const fileList = event.target.files
      if (!fileList?.length) return

      const files = Array.from(fileList)
      files.forEach(file => {
        if (!(file as any).webkitRelativePath) {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: file.name
          })
        }
      })
      await processAddFiles(files)
    } catch (error) {
      console.error('Error handling file change:', error)
      toast.error('添加文件时发生错误')
    } finally {
      event.target.value = ''
    }
  }

  /**
   * 创建文件输入处理器
   *
   * @param {boolean} isDirectory - 是否为文件夹选择
   * @returns {() => void} 文件选择处理函数
   */
  const createFileInputHandler = (isDirectory: boolean): () => void => () => {
    if (!isActive) {
      toast.error("会话已过期，请重新验证")
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    if (isDirectory) input.webkitdirectory = true
    input.onchange = (e: Event) => {
      handleFileChange({
        target: e.target as HTMLInputElement,
        preventDefault: () => {
        },
        stopPropagation: () => {
        },
        nativeEvent: e,
      } as React.ChangeEvent<HTMLInputElement>).then()
    }
    input.click()
  }

  /**
   * 获取文件夹的所有子文件ID（包括子文件夹的文件）
   */
  const getFolderChildrenIds = (folder: FileToUpload): string[] => {
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
  const getFolderCheckState = (folder: FileToUpload, selectedSet: Set<string>): boolean => {
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
    const updateFolder = (files: FileToUpload[], parentPath: FileToUpload[] = []): boolean => {
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
  const handleFileSelect = (fileId: string, checked: boolean, file: FileToUpload) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)

      // 处理当前文件
      checked ? newSet.add(fileId) : newSet.delete(fileId)

      // 如果是文件夹，处理所有子文件
      if (file.type === 'folder') {
        const processChildren = (folder: FileToUpload) => {
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
  const getAllFileIds = (files: FileToUpload[]): string[] => {
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
   * @param {boolean} checked - 是否全选
   */
  const handleSelectAll = (checked: boolean) => {
    setSelectedFiles(() => {
      const newSet = new Set<string>()
      if (checked) {
        // 获取所有文件和文件夹的ID
        const getAllIds = (items: FileToUpload[]): void => {
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
   * 批量删除选中的文件
   */
  const handleBatchDelete = () => {
    if (selectedFiles.size === 0) return

    setFiles(prev => {
      const removeSelectedFiles = (files: FileToUpload[]): FileToUpload[] => {
        return files.filter(file => {
          if (selectedFiles.has(file.id)) return false
          if (file.type === 'folder' && file.children) file.children = removeSelectedFiles(file.children)
          return true
        })
      }
      return removeSelectedFiles(prev)
    })
    setSelectedFiles(new Set())
  }

  /**
   * 获取选中的实际文件数量（不包含文件夹）
   */
  const getSelectedFilesCount = (currentFiles: FileToUpload[]): number => {
    return currentFiles.reduce((count, file) => {
      if (file.type === 'folder') return count + (file.children ? getSelectedFilesCount(file.children) : 0)
      return count + (selectedFiles.has(file.id) ? 1 : 0)
    }, 0)
  }

  /**
   * 渲染文件/文件夹列表项
   *
   * @param {FileToUpload} file - 文件对象
   * @param {number} [depth=0] - 文件夹嵌套深度
   * @returns {React.ReactNode} 渲染的文件列表项
   */
  const renderFileItem = (file: FileToUpload, depth: number = 0): React.ReactNode => {
    const isFolder = file.type === 'folder'
    const isExpanded = expandedFolders.has(file.id)
    const checked = isFolder
      ? getFolderCheckState(file, selectedFiles)
      : selectedFiles.has(file.id)

    const getFolderStatus = (folder: FileToUpload): 'not_started' | 'uploading' | 'completed' => {
      if (!folder.children?.length) return 'not_started'

      // 只统计文件，不统计文件夹
      const fileStatuses = folder.children.reduce((acc: string[], child) => {
        if (child.type === 'file') {
          acc.push(child.status || 'not_started')
        } else if (child.type === 'folder') {
          // 递归获取子文件夹的状态
          const childStatus = getFolderStatus(child)
          acc.push(childStatus)
        }
        return acc
      }, [])

      if (fileStatuses.length === 0) return 'not_started'

      // 如果所有文件都是 completed，则显示完成
      if (fileStatuses.every(status => status === 'completed')) return 'completed'

      // 如果所有文件都是 not_started，则显示未上传
      if (fileStatuses.every(status => status === 'not_started')) return 'not_started'

      // 其他情况显示上传中
      return 'uploading'
    }

    const getStatusDisplay = (file: FileToUpload) => {
      if (isFolder) {
        const folderStatus = getFolderStatus(file)
        switch (folderStatus) {
          case 'not_started':
            return <span className="text-muted-foreground">未上传</span>
          case 'uploading':
            return <span className="text-blue-500">上传中</span>
          case 'completed':
            return <span className="text-green-500">完成</span>
        }
      }

      const status = file.status || 'not_started'
      switch (status) {
        case 'not_started':
          return <span className="text-muted-foreground">未上传</span>
        case 'preparing':
          return <span className="text-blue-500">正在准备</span>
        case 'uploading':
          return (
            <span className="text-blue-500">
              {file.uploadedSize ? `${formatFileSize(file.uploadedSize)}` : ``} ({file.progress}%)
            </span>
          )
        case 'verifying':
          return <span className="text-yellow-500">正在校验</span>
        case 'completed':
          return <span className="text-green-500">完成</span>
        case 'error_preparing':
          return <span
            className="text-red-500">准备失败 ({file.error?.retryCount || 0}/{retryConfig.stages.preparing.maxRetries})</span>
        case 'error_uploading':
          return <span
            className="text-red-500">上传失败 ({file.error?.retryCount || 0}/{retryConfig.stages.uploading.maxRetries})</span>
        case 'error_verifying':
          return <span
            className="text-red-500">校验失败 ({file.error?.retryCount || 0}/{retryConfig.stages.verifying.maxRetries})</span>
        case 'retrying':
          return <span className="text-yellow-500">重试中...</span>
      }
    }

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
          <TableCell className="text-right">
            {getStatusDisplay(file)}
          </TableCell>
        </TableRow>
        {isFolder && isExpanded && file.children?.map(child => renderFileItem(child, depth + 1))}
      </React.Fragment>
    )
  }

  useEffect(() => {
    console.log('Transfer status:', {
      isValidating,
      isActive,
      status: transferInfo?.status,
      shouldEnableDrop: !isValidating && transferInfo && isActive && ["PICKING"].includes(transferInfo.status)
    })

    if (!isValidating && transferInfo && isActive && ["PICKING"].includes(transferInfo.status)) {
      console.log('Enabling drag drop')
      enableDragDrop(processAddFiles)
      return () => {disableDragDrop()}
    }
    disableDragDrop()
  }, [isValidating, transferInfo, isActive, enableDragDrop, disableDragDrop, processAddFiles])

  /**
   * 检查是否需要显示上传确认对话框
   */
  const checkUploadConfirmation = () => {
    const allFileIds = getAllFileIds(files)
    // 如果全选或全不选，直接上传
    if (selectedFiles.size === 0 || selectedFiles.size === allFileIds.length) {
      void handleUpload()
    } else {
      // 否则显示确认对话框
      setShowUploadConfirm(true)
    }
  }

  if (isValidating || !transferInfo) return (
    <Layout width="middle">
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">{isValidating ? "正在验证会话..." : "会话异常，请刷新重试"}</p>
      </div>
    </Layout>
  )

  // 根据会话状态显示不同页面
  if (transferInfo.status === "CONFIGURING") return <UploadConfigure 
    transferInfo={transferInfo}
    onStatusChange={(info) => setTransferInfo(info)}
  />

  if (transferInfo.status === "COMPLETED") return <UploadComplete transferInfo={transferInfo}/>

  return (
    <Layout width="middle" title="文件上传">
      <div className="space-y-4">
        <Title buttonType="back" title="上传"/>

        <div className="bg-muted p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">传输信息</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
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

        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />

        {files.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-gray-500">
                先添加文件再上传，可拖拽文件到页面添加
              </div>
            </label>
          </div>
        )}

        {files.length > 0 && (
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
                variant="destructive"
                size="icon"
                onClick={handleBatchDelete}
                disabled={selectedFiles.size === 0 || isUploading}
                className="h-8 w-8 bg-red-600/90 dark:bg-red-800/90 hover:bg-red-700 dark:hover:bg-red-900 transition-colors"
              >
                <Trash2 className="h-4 w-4"/>
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
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map(file => renderFileItem(file))}
              </TableBody>
            </Table>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={createFileInputHandler(false)}
            >
              <Plus className="w-4 h-4 mr-2"/>
              添加文件
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={createFileInputHandler(true)}
            >
              <FolderIcon className="w-4 h-4 mr-2"/>
              添加文件夹
            </Button>
          </div>
          <Button
            onClick={checkUploadConfirmation}
            disabled={isUploading || files.length === 0}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4"/>
            {isUploading ? '上传中...' : '开始上传'}
          </Button>
        </div>
      </div>

      <Dialog open={showUploadConfirm} onOpenChange={setShowUploadConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传范围提醒</DialogTitle>
            <DialogDescription>
              继续操作将上传<b><Shake>所有</Shake></b>文件（包括<b><Shake>未选中的</Shake></b>文件）。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadConfirm(false)}>
              取消
            </Button>
            <Button onClick={() => {
              setShowUploadConfirm(false)
              void handleUpload()
            }}>
              继续上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
} 