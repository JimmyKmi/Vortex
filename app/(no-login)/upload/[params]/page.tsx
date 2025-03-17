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
    params: string
  }>
  searchParams: { [key: string]: string | string[] | undefined }
}

import React, { use, useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout'
import axios, { AxiosProgressEvent, AxiosRequestConfig } from 'axios'
import { Button } from '@/components/ui/button'
import { FolderIcon, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import UploadConfigure from './configure'
import UploadComplete from './complete'
import { useDragDrop } from '@/contexts/drag-drop-context'
import { formatFileSize } from '@/lib/utils/file'
import { useTransferSession } from '@/hooks/useTransferSession'
import { useApi } from '@/hooks/useApi'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Shake } from '@/components/jimmy-ui/shake'
import { TransferInfo } from '@/components/transfer-page/transfer-info'
import { FileTree, FileTreeRef } from '@/components/jimmy-ui/file-tree'

interface FileError {
  stage: 'preparing' | 'uploading' | 'verifying'
  message: string
  retryCount: number
  lastError?: Error
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
  id: string
  name: string
  size: string
  sizeInBytes: number
  type: 'file' | 'folder'
  children?: FileToUpload[]
  relativePath?: string
  file?: File
  status?:
    | 'not_started'
    | 'preparing'
    | 'uploading'
    | 'verifying'
    | 'completed'
    | 'error_preparing'
    | 'error_uploading'
    | 'error_verifying'
    | 'retrying'
  progress?: number
  uploadedSize?: number
  selected?: boolean
  error?: FileError
  retryCount?: number
}

/**
 * 重试配置
 */
const retryConfig = {
  maxRetries: 6,
  retryDelay: 1000,
  exponentialBackoff: true,
  stages: {
    preparing: { maxRetries: 3, retryDelay: 2000 },
    uploading: { maxRetries: 5, retryDelay: 2000 },
    verifying: { maxRetries: 6, retryDelay: 2000 }
  }
}
/**
 * 更新文件列表中指定文件的状态
 *
 * @param {FileToUpload[]} files - 原文件列表
 * @param {string} fileId - 要更新的文件ID
 * @param {Partial<FileToUpload>} updates - 更新的属性
 * @returns {FileToUpload[]} 更新后的文件列表
 */
const updateFileInList = (files: FileToUpload[], fileId: string, updates: Partial<FileToUpload>): FileToUpload[] => {
  return files.map((f) => {
    if (f.id === fileId) return { ...f, ...updates }
    if (f.type === 'folder' && f.children) {
      return { ...f, children: updateFileInList(f.children, fileId, updates) }
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
 * @param api
 * @returns {Promise<{uploadUrl: string, uploadFields: Record<string, string>, s3BasePath: string, uploadToken: string, id: string}>}
 */
const generateUploadUrl = async (
  params: {
    name: string
    relativePath: string
    isDirectory: boolean
    mimeType?: string
    size?: number
  },
  sessionId: string,
  api: ReturnType<typeof useApi>
): Promise<{
  uploadUrl: string
  uploadFields: Record<string, string>
  s3BasePath: string
  uploadToken: string
  id: string
} | null> => {
  return await api.call<{
    uploadUrl: string
    uploadFields: Record<string, string>
    s3BasePath: string
    uploadToken: string
    id: string
  }>(axios.post(`/api/transfer-sessions/${sessionId}/upload/generate-upload-url`, params), {
    errorMessage: '获取上传URL失败',
    onError: (error) =>
      console.error('Generate upload URL error:', {
        error,
        params,
        message: error?.message,
        response: error?.response?.data
      })
  })
}

export default function UploadPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const sessionId = resolvedParams.params
  const [files, setFiles] = useState<FileToUpload[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set()) // 保留状态，以便交互
  const [isUploading, setIsUploading] = useState(false)
  const { enableDragDrop, disableDragDrop } = useDragDrop()
  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const { isActive, isValidating, transferInfo, setTransferInfo, checkSessionActive } = useTransferSession({
    sessionId
  })
  const api = useApi()
  const fileTreeRef = useRef<FileTreeRef>(null)

  /**
   * 根据文件路径查找文件
   */
  const getFileByPath = useCallback((fileList: FileToUpload[], path: string): FileToUpload | null => {
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase()

    for (const file of fileList) {
      const currentPath = (file.relativePath || file.name).replace(/\\/g, '/').toLowerCase()

      // 路径完全匹配
      if (currentPath === normalizedPath) return file

      // 递归检查子文件
      if (file.type === 'folder' && file.children && normalizedPath.startsWith(currentPath + '/')) {
        const found = getFileByPath(file.children, path)
        if (found) return found
      }
    }

    return null
  }, [])

  // 计算默认选中的文件，只在files变化时更新
  const computeDefaultSelectedFiles = useCallback(() => {
    // 递归获取所有文件和文件夹ID
    const getAllIds = (files: FileToUpload[]): string[] => {
      return files.reduce((acc: string[], file) => {
        // 同时选中文件和文件夹
        acc.push(file.id)

        if (file.type === 'folder' && file.children) {
          acc.push(...getAllIds(file.children))
        }
        return acc
      }, [])
    }

    return new Set(getAllIds(files))
  }, [files])

  // 缓存默认选中的文件ID
  const defaultSelectedFiles = useMemo(() => {
    return computeDefaultSelectedFiles()
  }, [computeDefaultSelectedFiles])

  /**
   * 检查文件是否重复
   */
  const isFileDuplicate = useCallback(
    (path: string): boolean => {
      return getFileByPath(files, path) !== null
    },
    [files, getFileByPath]
  )

  /**
   * 处理文件选择事件
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - 文件选择事件
   */
  const handleFileChangeCallback = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!checkSessionActive()) return
      try {
        const fileList = event.target.files
        if (!fileList?.length) return

        const files = Array.from(fileList)
        await processAddFiles(files)
      } catch (error) {
        console.error('Error handling file change:', error)
        toast.error('添加文件时发生错误')
      } finally {
        event.target.value = ''
      }
    },
    [checkSessionActive]
  )

  /**
   * 创建文件输入处理函数
   * @param {boolean} isDirectory - 是否为文件夹选择
   * @returns {() => void} 文件选择处理函数
   */
  const createFileInputHandler = useCallback(
    (isDirectory: boolean): (() => void) =>
      () => {
        if (!checkSessionActive()) return

        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        if (isDirectory) input.webkitdirectory = true

        input.onchange = (e: Event) => {
          handleFileChangeCallback({
            target: e.target as HTMLInputElement,
            preventDefault: () => {},
            stopPropagation: () => {},
            nativeEvent: e
          } as React.ChangeEvent<HTMLInputElement>).then()
        }

        input.click()
      },
    [checkSessionActive, handleFileChangeCallback]
  )

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
  const processAddFiles = useCallback(
    async (files: File[]) => {
      try {
        const newFiles: FileToUpload[] = []
        const duplicates: string[] = []
        const processedPaths = new Set<string>()
        const currentFiles = await new Promise<FileToUpload[]>((resolve) => {
          setFiles((prev) => {
            resolve(prev)
            return prev
          })
        })

        // 构建文件夹树结构
        const folderTree: { [key: string]: FileToUpload } = {}

        // 初始化现有的文件夹树结构
        const initExistingFolderTree = (files: FileToUpload[]) => {
          files.forEach((file) => {
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
          if (isFileDuplicate(filePath)) {
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
              if (parentFolder) {
                parentFolder.children!.push(newFolder)
              } else {
                newFiles.push(newFolder)
              }
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
          if (parentFolder) {
            parentFolder.children!.push(newFile)
          } else {
            newFiles.push(newFile)
          }
          processedPaths.add(normalizedPath)
        }

        // 更新所有顶层文件夹的大小
        const updateAllFolderSizes = (files: FileToUpload[]) => {
          files.forEach((file) => {
            if (file.type === 'folder') updateFolderSize(file)
          })
        }
        updateAllFolderSizes(currentFiles)
        updateAllFolderSizes(newFiles)

        // 合并新文件到现有结构
        const mergeFiles = (existingFiles: FileToUpload[], newFilesToAdd: FileToUpload[]): FileToUpload[] => {
          const result = [...existingFiles]

          newFilesToAdd.forEach((newFile) => {
            const existingFileIndex = result.findIndex(
              (existing) => existing.type === 'folder' && existing.relativePath === newFile.relativePath
            )

            if (existingFileIndex !== -1 && newFile.type === 'folder') {
              // 如果文件夹已存在，合并子项
              const existingFolder = result[existingFileIndex]
              existingFolder.children = mergeFiles(existingFolder.children || [], newFile.children || [])
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
          setFiles((prev) => mergeFiles(prev, newFiles))
          toast.success(`成功添加 ${processedPaths.size} 个文件`)

          // 添加文件后，自动选中所有文件
          if (fileTreeRef.current) {
            fileTreeRef.current.selectAll()
          }
        }

        // 重复文件的提示
        if (duplicates.length > 0) {
          toast.error(`${duplicates.length} 个文件已存在，已自动跳过：\n${duplicates.join('、')}`)
        }
      } catch (error) {
        console.error('处理文件添加时发生错误:', error)
        toast.error('添加文件时发生错误')
      }
    },
    [isFileDuplicate]
  )

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
    if (!checkSessionActive()) return

    if (files.length === 0) {
      toast.error('请先选择要上传的文件')
      return
    }

    setIsUploading(true)
    let hasError = false

    try {
      // 开始上传，获取下载码
      await api.call(axios.post(`/api/transfer-sessions/${sessionId}/upload/start`), {
        errorMessage: '启动上传失败',
        onError: (error) => {
          // 如果返回已经开始上传的错误，则忽略继续执行
          if (error?.name === 'AlreadyStarted') {
            console.log('Upload already started, continuing...')
            return
          }
          hasError = true
        }
      })

      // 如果开始上传失败且不是AlreadyStarted，则直接返回
      if (hasError) return

      // 设置所有文件的初始状态为等待
      setFiles((prev) => {
        const setInitialStatus = (files: FileToUpload[]): FileToUpload[] => {
          return files.map((f) => ({
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
        const allFiles: FileToUpload[] = []
        const traverse = (items: FileToUpload[]) => {
          items.forEach((item) => {
            allFiles.push(item)
            if (item.children) traverse(item.children)
          })
        }
        traverse(files)
        return allFiles
      }

      const allFiles = flattenFiles(files)

      // 创建一个函数来处理单个文件的上传
      const processUpload = async (file: FileToUpload) => {
        const retryUpload = async (stage: 'preparing' | 'uploading' | 'verifying', error: any): Promise<boolean> => {
          const stageConfig = retryConfig.stages[stage]
          const currentRetryCount = (file.error?.retryCount || 0) + 1

          if (currentRetryCount > stageConfig.maxRetries) return false

          // 更新状态为重试中
          setFiles((prev) =>
            updateFileInList(prev, file.id, {
              status: 'retrying',
              error: {
                stage,
                message: error?.response?.data?.message || error?.message || `${stage}阶段失败`,
                retryCount: currentRetryCount,
                lastError: error
              }
            })
          )

          // 计算延迟时间
          const delay = retryConfig.exponentialBackoff
            ? stageConfig.retryDelay * Math.pow(2, currentRetryCount - 1)
            : stageConfig.retryDelay

          // 等待一段时间后重试
          await new Promise((resolve) => setTimeout(resolve, delay))
          return true
        }

        try {
          // 先处理文件夹创建
          if (file.type === 'folder') {
            // 更新文件夹状态
            setFiles((prev) =>
              updateFileInList(prev, file.id, {
                status: 'completed',
                progress: 100
              })
            )
            return
          }

          // 更新文件状态为准备中
          setFiles((prev) =>
            updateFileInList(prev, file.id, {
              status: 'preparing',
              progress: 0,
              error: undefined
            })
          )

          let uploadData
          // 1. 生成上传URL阶段
          while (true) {
            try {
              uploadData = await generateUploadUrl(
                {
                  name: file.name,
                  mimeType: file.file?.type || 'application/octet-stream',
                  size: file.file?.size || 0,
                  relativePath: file.relativePath || '',
                  isDirectory: false
                },
                sessionId,
                api
              )

              if (!uploadData) {
                setFiles((prev) =>
                  updateFileInList(prev, file.id, {
                    status: 'error_preparing',
                    error: {
                      stage: 'preparing',
                      message: '准备上传失败',
                      retryCount: (file.error?.retryCount || 0) + 1
                    }
                  })
                )
                return
              }
              break
            } catch (error: any) {
              const canRetry = await retryUpload('preparing', error)
              if (!canRetry) {
                setFiles((prev) =>
                  updateFileInList(prev, file.id, {
                    status: 'error_preparing',
                    error: {
                      stage: 'preparing',
                      message: error?.response?.data?.message || error?.message || '准备上传失败',
                      retryCount: (file.error?.retryCount || 0) + 1,
                      lastError: error
                    }
                  })
                )
                return
              }
            }
          }

          // 更新文件状态为上传中
          setFiles((prev) =>
            updateFileInList(prev, file.id, {
              status: 'uploading',
              progress: 0,
              error: undefined
            })
          )

          // 2. 执行文件上传阶段
          while (true) {
            try {
              const formData = new FormData()
              Object.entries(uploadData.uploadFields).forEach(([key, value]) => {
                formData.append(key, value as string)
              })
              formData.append('file', file.file!)

              await axios.post(uploadData.uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 0,
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
                  setFiles((prev) =>
                    updateFileInList(prev, file.id, {
                      progress: percentCompleted,
                      uploadedSize: progressEvent.loaded
                    })
                  )
                }
              } as AxiosRequestConfig)
              break
            } catch (error: any) {
              const canRetry = await retryUpload('uploading', error)
              if (!canRetry) {
                setFiles((prev) =>
                  updateFileInList(prev, file.id, {
                    status: 'error_uploading',
                    error: {
                      stage: 'uploading',
                      message: error?.response?.data?.message || error?.message || '文件上传失败',
                      retryCount: (file.error?.retryCount || 0) + 1,
                      lastError: error
                    }
                  })
                )
                return
              }
            }
          }

          // 更新文件状态为校验中
          setFiles((prev) =>
            updateFileInList(prev, file.id, {
              status: 'verifying',
              progress: 100,
              error: undefined
            })
          )

          // 3. 记录上传信息阶段
          while (true) {
            try {
              // 记录上传
              const recordResponse = await api.call(
                axios.post(`/api/transfer-sessions/${sessionId}/upload/record`, {
                  name: file.name,
                  mimeType: file.file?.type || 'application/octet-stream',
                  size: file.file?.size || 0,
                  relativePath: file.relativePath || '',
                  isDirectory: false,
                  s3BasePath: uploadData.s3BasePath,
                  uploadToken: uploadData.uploadToken,
                  userId: transferInfo!.createdBy || undefined
                }),
                { errorMessage: '记录上传失败' }
              )

              if (!recordResponse) {
                const error = new Error('记录上传失败')
                const canRetry = await retryUpload('verifying', error)
                if (!canRetry) {
                  setFiles((prev) =>
                    updateFileInList(prev, file.id, {
                      status: 'error_verifying',
                      error: {
                        stage: 'verifying',
                        message: '记录上传失败',
                        retryCount: (file.error?.retryCount || 0) + 1,
                        lastError: error
                      }
                    })
                  )
                  return
                }
                continue
              }
              break
            } catch (error: any) {
              const canRetry = await retryUpload('verifying', error)
              if (!canRetry) {
                setFiles((prev) =>
                  updateFileInList(prev, file.id, {
                    status: 'error_verifying',
                    error: {
                      stage: 'verifying',
                      message: error?.response?.data?.message || error?.message || '记录上传失败',
                      retryCount: (file.error?.retryCount || 0) + 1,
                      lastError: error
                    }
                  })
                )
                return
              }
            }
          }

          // 更新文件状态为完成
          setFiles((prev) =>
            updateFileInList(prev, file.id, {
              status: 'completed',
              progress: 100,
              error: undefined
            })
          )
        } catch (error: any) {
          console.error('Process upload error for file:', {
            error,
            file: file.name,
            message: error?.message,
            response: error?.response?.data
          })
          hasError = true
          toast.error(`上传 ${file.name} 失败: ${error?.response?.data?.message || error?.message || '未知错误'}`)
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
        // 类型定义返回数据结构
        interface CompleteUploadResponse {
          downloadCode: string
        }

        const completeResponse = await api.call<CompleteUploadResponse>(
          axios.post(`/api/transfer-sessions/${sessionId}/upload/complete`),
          { errorMessage: '完成上传失败' }
        )

        if (completeResponse) {
          // 更新传输信息状态
          setTransferInfo((prev) => ({
            ...prev!,
            status: 'CONFIGURING',
            downloadCode: completeResponse.downloadCode
          }))

          toast.success('所有文件上传成功！')

          // 等待状态更新完成后再刷新页面
          await new Promise((resolve) => setTimeout(resolve, 500))
          router.refresh()
        }
      }
    } catch (error: any) {
      console.error('Upload process error:', error)
      toast.error(error.message || '上传过程中发生错误')
    } finally {
      setIsUploading(false)
    }
  }

  /**
   * 处理反选
   */
  const handleInvertSelection = () => {
    // 使用FileTree组件的内置方法
    fileTreeRef.current?.invertSelection()
  }

  /**
   * 处理选择变化
   */
  const handleSelectionChange = useCallback((newSelectedFiles: Set<string>) => {
    // 避免不必要的更新 - 只有当新旧集合不同时才更新
    setSelectedFiles((prev) => {
      // 检查新旧集合是否相同
      if (prev.size !== newSelectedFiles.size) return newSelectedFiles

      // 检查内容是否相同
      for (const id of prev) {
        if (!newSelectedFiles.has(id)) return newSelectedFiles
      }

      // 如果集合大小和内容都相同，保持原状态
      return prev
    })
  }, [])

  /**
   * 批量删除选中的文件
   */
  const handleBatchDelete = () => {
    if (selectedFiles.size === 0) return

    setFiles((prev) => {
      const removeSelectedFiles = (files: FileToUpload[]): FileToUpload[] => {
        return files.filter((file) => {
          if (selectedFiles.has(file.id)) return false
          if (file.type === 'folder' && file.children) file.children = removeSelectedFiles(file.children)
          return true
        })
      }
      return removeSelectedFiles(prev)
    })
    // 清除选择
    setSelectedFiles(new Set())
    // 如果有更多选择相关逻辑，可以调用组件的方法
    fileTreeRef.current?.deselectAll()
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

  // 渲染文件状态
  const renderFileStatus = (file: FileToUpload) => {
    if (file.type === 'folder') {
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
            {file.uploadedSize ? `${formatFileSize(file.uploadedSize)}` : ''} ({file.progress}%)
          </span>
        )
      case 'verifying':
        return <span className="text-yellow-500">正在校验</span>
      case 'completed':
        return <span className="text-green-500">完成</span>
      case 'error_preparing':
        return (
          <span className="text-red-500">
            准备失败 ({file.error?.retryCount || 0}/{retryConfig.stages.preparing.maxRetries})
          </span>
        )
      case 'error_uploading':
        return (
          <span className="text-red-500">
            上传失败 ({file.error?.retryCount || 0}/{retryConfig.stages.uploading.maxRetries})
          </span>
        )
      case 'error_verifying':
        return (
          <span className="text-red-500">
            校验失败 ({file.error?.retryCount || 0}/{retryConfig.stages.verifying.maxRetries})
          </span>
        )
      case 'retrying':
        return <span className="text-yellow-500">重试中...</span>
      default:
        return <span className="text-muted-foreground">未知状态</span>
    }
  }

  /**
   * 获取文件夹状态
   */
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
    if (fileStatuses.every((status) => status === 'completed')) return 'completed'

    // 如果所有文件都是 not_started，则显示未上传
    if (fileStatuses.every((status) => status === 'not_started')) return 'not_started'

    // 其他情况显示上传中
    return 'uploading'
  }

  // 为DragDrop上下文提供的简化版processAddFiles
  const handleDragDropFiles = useCallback(
    (files: File[]) => {
      processAddFiles(files).catch((error) => {
        console.error('Error handling drag drop files:', error)
        toast.error('添加文件时发生错误')
      })
    },
    [processAddFiles]
  )

  /**
   * 组件卸载时清理事件监听和轮询
   */
  useEffect(() => {
    if (isActive) {
      enableDragDrop(handleDragDropFiles)
    } else {
      disableDragDrop()
    }

    return () => {
      disableDragDrop()
    }
  }, [isActive, enableDragDrop, disableDragDrop, handleDragDropFiles])

  /**
   * 处理URL查询参数
   */
  useEffect(() => {
    if (!checkSessionActive()) return

    // 获取 URL 搜索参数，特别是 action 值
    const urlParams = new URLSearchParams(window.location.search)
    const action = urlParams.get('action')

    // 当 action 为 'start-upload' 时，自动打开文件选择
    if (action === 'start-upload') {
      createFileInputHandler(false)()

      // 清除 URL 参数，防止刷新页面时重复触发
      router.replace(`/upload/${sessionId}`, { scroll: false })
    }
  }, [sessionId, router, checkSessionActive, createFileInputHandler])

  /**
   * 检查是否需要显示上传确认对话框
   */
  const checkUploadConfirmation = () => {
    if (!fileTreeRef.current) return

    // 获取所有的文件（不包括文件夹）
    const getAllFileIdsHelper = (items: FileToUpload[]): string[] => {
      return items.reduce((acc: string[], item) => {
        if (item.type === 'file') {
          acc.push(item.id)
        } else if (item.type === 'folder' && item.children) {
          acc.push(...getAllFileIdsHelper(item.children))
        }
        return acc
      }, [])
    }
    const allFileIds = getAllFileIdsHelper(files)

    const currentSelectedFiles = fileTreeRef.current.getSelectedFiles()

    // 检查是否全选了所有文件
    const isFullSelection = allFileIds.length > 0 && allFileIds.every((id) => currentSelectedFiles.has(id))

    // 检查是否一个文件都没选
    const isNoSelection = allFileIds.every((id) => !currentSelectedFiles.has(id))

    // 全选或未选择任何文件时直接上传
    if (isFullSelection || isNoSelection) {
      void handleUpload()
    } else {
      setShowUploadConfirm(true)
    }
  }

  // 根据验证状态显示加载页面
  if (isValidating || !transferInfo) {
    return (
      <Layout width="middle">
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">{isValidating ? '正在验证会话...' : '会话异常，请刷新重试'}</p>
        </div>
      </Layout>
    )
  }

  // 根据会话状态显示不同页面
  if (transferInfo.status === 'CONFIGURING') {
    return (
      <UploadConfigure
        transferInfo={transferInfo}
        onStatusChangeAction={(info: typeof transferInfo) => setTransferInfo(info)}
      />
    )
  }

  if (transferInfo.status === 'COMPLETED') {
    return <UploadComplete transferInfo={transferInfo} />
  }

  return (
    <Layout width="middle" title="文件上传" buttonType="back">
      <TransferInfo transferInfo={transferInfo} />

      <input type="file" multiple onChange={handleFileChangeCallback} className="hidden" id="file-upload" />

      {files.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-gray-500">先添加文件再上传，可拖拽文件到页面添加</div>
          </label>
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="flex flex-col-reverse items-stretch sm:flex-row justify-between gap-2 bg-muted/50 p-2 rounded-lg">
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={handleInvertSelection} className="h-8">
                反选
              </Button>
              <span className="text-sm text-muted-foreground">已选择 {getSelectedFilesCount(files)} 个文件</span>
            </div>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleBatchDelete}
              disabled={selectedFiles.size === 0 || isUploading}
              className="h-8 w-8 bg-red-600/90 dark:bg-red-800/90 hover:bg-red-700 dark:hover:bg-red-900 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <FileTree
            ref={fileTreeRef}
            files={files}
            mode="uncontrolled"
            defaultSelectedFiles={defaultSelectedFiles}
            onSelectionChange={handleSelectionChange}
            renderStatus={renderFileStatus}
            disabled={isUploading}
          />
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={createFileInputHandler(false)}>
            <Plus className="w-4 h-4 mr-2" />
            添加文件
          </Button>
          <Button variant="outline" className="flex-1" onClick={createFileInputHandler(true)}>
            <FolderIcon className="w-4 h-4 mr-2" />
            添加文件夹
          </Button>
        </div>
        <Button
          onClick={checkUploadConfirmation}
          disabled={isUploading || files.length === 0}
          className="w-full sm:w-auto"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? '上传中...' : '开始上传'}
        </Button>
      </div>

      <Dialog open={showUploadConfirm} onOpenChange={setShowUploadConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传范围提醒</DialogTitle>
            <DialogDescription>
              继续操作将上传
              <b>
                <Shake>所有</Shake>
              </b>
              文件（包括
              <b>
                <Shake>未选中的</Shake>
              </b>
              文件）。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadConfirm(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setShowUploadConfirm(false)
                void handleUpload()
              }}
            >
              继续上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
