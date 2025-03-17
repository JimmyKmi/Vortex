/**
 * 获取下载文件列表API
 * 提供下载会话关联的文件列表，包含文件夹结构
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTransferSession } from '@/lib/utils/transfer-session'
import { ResponseSuccess, ResponseThrow } from '@/lib/utils/response'
import { formatFileSize } from '@/lib/utils/file'

interface FileNode {
  id: string
  name: string
  size: string
  sizeInBytes: number
  type: 'file' | 'folder'
  children?: FileNode[]
  relativePath?: string
}

/**
 * 构建文件树
 * @param files 文件列表
 * @returns 文件树结构
 */
function buildFileTree(files: any[]): FileNode[] {
  if (!Array.isArray(files)) {
    console.error('Invalid files input:', files)
    return []
  }

  const root: FileNode[] = []
  const folderMap = new Map<string, FileNode>()

  // 首先创建所有文件夹节点
  files.forEach(file => {
    try {
      if (!file?.relativePath) {
        console.error('File missing relativePath:', file)
        return
      }

      const pathParts = file.relativePath.split('/')
      let currentPath = ''

      // 为每一级路径创建文件夹节点
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i]
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

        if (!folderMap.has(currentPath)) {
          const folderNode: FileNode = {
            id: `folder_${currentPath}`, // 使用路径作为文件夹ID
            name: folderName,
            size: '0',
            sizeInBytes: 0,
            type: 'folder',
            relativePath: currentPath,
            children: []
          }
          folderMap.set(currentPath, folderNode)

          // 如果是顶级文件夹，添加到根节点
          if (!currentPath.includes('/')) {
            root.push(folderNode)
          } else {
            // 否则添加到父文件夹
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'))
            const parentFolder = folderMap.get(parentPath)
            if (parentFolder?.children) {
              parentFolder.children.push(folderNode)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating folder structure:', error)
    }
  })

  // 然后添加所有文件到对应的文件夹
  files.forEach(file => {
    try {
      if (!file?.id || !file?.name || !file?.relativePath) {
        console.error('Invalid file object:', file)
        return
      }

      const node: FileNode = {
        id: file.id,
        name: file.name,
        size: formatFileSize(file.size || 0),
        sizeInBytes: file.size || 0,
        type: file.mimeType === 'application/x-directory' ? 'folder' : 'file',
        relativePath: file.relativePath
      }

      // 如果是文件夹，确保有 children 数组
      if (node.type === 'folder') {
        node.children = []
        // 更新 folderMap 中的节点
        folderMap.set(file.relativePath, node)
      }

      const pathParts = file.relativePath.split('/')
      if (pathParts.length === 1) {
        // 顶级文件直接添加到根节点
        root.push(node)
      } else {
        // 获取父文件夹路径
        const parentPath = file.relativePath.substring(0, file.relativePath.lastIndexOf('/'))
        const parentFolder = folderMap.get(parentPath)
        if (parentFolder?.children) {
          parentFolder.children.push(node)
        }
      }
    } catch (error) {
      console.error('Error adding file to tree:', error)
    }
  })

  // 计算文件夹大小
  const calculateFolderSize = (node: FileNode): number => {
    if (!node) return 0
    if (node.type === 'file') return node.sizeInBytes
    if (!node.children) return 0

    const totalSize = node.children.reduce((sum, child) => sum + calculateFolderSize(child), 0)
    node.sizeInBytes = totalSize
    node.size = formatFileSize(totalSize)
    return totalSize
  }

  root.forEach(node => {
    try {
      calculateFolderSize(node)
    } catch (error) {
      console.error('Error calculating folder size for node:', node, error)
    }
  })

  return root
}

/**
 * 获取下载文件列表
 * @route GET /api/transfer-sessions/[id]/download/file-list
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id: sessionId } = await Promise.resolve(params)

    if (!sessionId) {
      console.error('Missing session ID')
      return ResponseThrow('InvalidSession')
    }

    console.log('Fetching session:', sessionId)

    // 获取会话信息
    const session = await prisma.transferSession
      .findUnique({
        where: { id: sessionId },
        include: {
          transferCode: true,
          linkedTransferCode: true
        }
      })
      .catch(error => {
        console.error('Database query error:', error)
        return null
      })

    if (!session) {
      console.error('Session not found:', sessionId)
      return ResponseThrow('InvalidSession')
    }

    if (!session.transferCode) {
      console.error('Transfer code not found for session:', sessionId)
      return ResponseThrow('InvalidSession')
    }

    // 验证会话
    const validationResult = await validateTransferSession(
      req,
      sessionId,
      ['DOWNLOADING'],
      ['DOWNLOAD'],
      session
    )
    if (!validationResult.valid) {
      console.error('Session validation failed:', {
        code: validationResult.code,
        sessionId,
        sessionStatus: session.status
      })
      return ResponseThrow(validationResult.code ?? 'InvalidSession')
    }

    // 获取文件列表
    if (!session.transferCodeId) {
      console.error('Transfer code not found for session:', {
        sessionId,
        transferCodeId: session.transferCodeId
      })
      return ResponseThrow('InvalidSession')
    }

    // 获取传输码关联的文件
    const transferCode = await prisma.transferCode.findUnique({
      where: {
        id: session.transferCodeId
      },
      include: {
        files: {
          include: {
            file: {
              select: {
                id: true,
                name: true,
                size: true,
                mimeType: true,
                relativePath: true
              }
            }
          }
        }
      }
    })

    if (!transferCode) {
      console.error('Transfer code not found:', {
        sessionId,
        transferCodeId: session.transferCodeId
      })
      return ResponseThrow('InvalidSession')
    }

    console.log('Transfer code found:', {
      id: transferCode.id,
      type: transferCode.type,
      filesCount: transferCode.files.length
    })

    // 如果没有文件，返回空数组
    if (!transferCode.files.length) {
      console.log('No files found for transfer code:', {
        sessionId,
        transferCodeId: session.transferCodeId,
        transferCodeType: transferCode.type
      })
      return ResponseSuccess([])
    }

    // 构建文件树
    console.log('Building file tree for files:', {
      sessionId,
      filesCount: transferCode.files.length
    })

    const fileTree = buildFileTree(
      transferCode.files.map(f => ({
        ...f.file,
        id: f.fileId
      }))
    )
    return ResponseSuccess(fileTree)
  } catch (error) {
    console.error('Get download file list error:', error)
    return ResponseThrow('InternalServerError')
  }
}
