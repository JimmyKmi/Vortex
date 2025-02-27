import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { 
  ChevronDown, 
  ChevronRight, 
  FileIcon, 
  FolderIcon 
} from 'lucide-react'

/**
 * 通用文件树节点接口
 * 定义FileTree组件所需的基本属性
 */
export interface FileTreeItem {
  id: string
  name: string
  size: string
  sizeInBytes: number
  type: 'file' | 'folder'
  children?: FileTreeItem[]
  relativePath?: string
  selected?: boolean
}

/**
 * FileTree组件Ref暴露的方法
 */
export interface FileTreeRef {
  /**
   * 反选所有文件
   */
  invertSelection: () => void;
  
  /**
   * 获取当前选中的文件ID
   */
  getSelectedFiles: () => Set<string>;
  
  /**
   * 获取当前展开的文件夹ID
   */
  getExpandedFolders: () => Set<string>;
  
  /**
   * 全选所有文件
   */
  selectAll: () => void;
  
  /**
   * 取消全选
   */
  deselectAll: () => void;
}

export interface FileTreeProps<T extends FileTreeItem> {
  /**
   * 文件数据
   */
  files: T[]
  
  /**
   * 控制状态方式：受控或非受控
   * - controlled: 由父组件完全控制所有状态
   * - uncontrolled: 由组件内部管理状态，父组件通过回调获取状态变化
   * @default "uncontrolled"
   */
  mode?: "controlled" | "uncontrolled"
  
  /**
   * 已选择的文件ID集合（受控模式必须提供）
   */
  selectedFiles?: Set<string>
  
  /**
   * 已展开的文件夹ID集合（受控模式必须提供）
   */
  expandedFolders?: Set<string>
  
  /**
   * 初始已选择的文件ID集合（非受控模式可选）
   */
  defaultSelectedFiles?: Set<string>
  
  /**
   * 初始已展开的文件夹ID集合（非受控模式可选）
   */
  defaultExpandedFolders?: Set<string>
  
  /**
   * 当选择状态变化时的回调
   */
  onSelectionChange?: (selectedFiles: Set<string>) => void
  
  /**
   * 当展开状态变化时的回调
   */
  onExpandChange?: (expandedFolders: Set<string>) => void
  
  /**
   * 文件夹切换展开/折叠回调（受控模式必须提供）
   */
  onToggleFolder?: (folderId: string) => void
  
  /**
   * 文件选择状态变更回调（受控模式必须提供）
   */
  onFileSelect?: (fileId: string, checked: boolean, file: T) => void
  
  /**
   * 全选回调（受控模式必须提供）
   */
  onSelectAll?: (checked: boolean) => void
  
  /**
   * 自定义状态渲染函数，用于显示不同页面的状态信息
   */
  renderStatus?: (file: T) => React.ReactNode
  
  /**
   * 自定义行渲染函数，用于完全自定义行的显示方式
   */
  renderRow?: (file: T, defaultRow: React.ReactNode) => React.ReactNode
  
  /**
   * 是否禁用交互
   */
  disabled?: boolean
  
  /**
   * 自定义表头
   */
  customHeaders?: React.ReactNode[]
  
  /**
   * 获取文件夹选中状态的函数（受控模式必须提供）
   */
  getFolderCheckState?: (folder: T, selectedSet: Set<string>) => boolean
  
  /**
   * 获取所有文件ID的函数（受控模式必须提供）
   */
  getAllFileIds?: (files: T[]) => string[]
}

/**
 * 通用文件树组件
 * 
 * 一个灵活的文件树组件，可以通过泛型和回调函数适应不同的文件数据结构和业务逻辑
 */
function FileTreeComponent<T extends FileTreeItem>(
  {
    files,
    mode = "uncontrolled",
    selectedFiles: externalSelectedFiles,
    expandedFolders: externalExpandedFolders,
    defaultSelectedFiles = new Set(),
    defaultExpandedFolders = new Set(),
    onSelectionChange,
    onExpandChange,
    onToggleFolder: externalToggleFolder,
    onFileSelect: externalFileSelect,
    onSelectAll: externalSelectAll,
    renderStatus,
    renderRow,
    disabled = false,
    customHeaders,
    getFolderCheckState: externalGetFolderCheckState,
    getAllFileIds: externalGetAllFileIds
  }: FileTreeProps<T>,
  ref: React.ForwardedRef<FileTreeRef>
) {
  // 内部状态管理 - 仅非受控模式使用
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<Set<string>>(defaultSelectedFiles)
  const [internalExpandedFolders, setInternalExpandedFolders] = useState<Set<string>>(defaultExpandedFolders)
  
  // 实际使用的状态 - 根据模式选择内部或外部状态
  const selectedFiles = mode === "controlled" ? externalSelectedFiles || new Set() : internalSelectedFiles
  const expandedFolders = mode === "controlled" ? externalExpandedFolders || new Set() : internalExpandedFolders
  
  // 避免在渲染过程中调用父组件的回调函数
  const notifySelectionChange = (newSelection: Set<string>) => {
    if (onSelectionChange) {
      // 使用setTimeout将回调推迟到渲染完成后执行
      setTimeout(() => {
        onSelectionChange(newSelection);
      }, 0);
    }
  };
  
  const notifyExpandChange = (newExpanded: Set<string>) => {
    if (onExpandChange) {
      setTimeout(() => {
        onExpandChange(newExpanded);
      }, 0);
    }
  };
  
  // 内部实现的通用操作方法
  
  /**
   * 获取所有叶子节点（文件）的ID
   */
  const getAllFileOnlyIds = (currentFiles: T[]): string[] => {
    return currentFiles.reduce((acc: string[], file) => {
      if (file.type === 'file') {
        acc.push(file.id)
      } else if (file.type === 'folder' && file.children) {
        acc.push(...getAllFileOnlyIds(file.children as T[]))
      }
      return acc
    }, [])
  }
  
  /**
   * 获取所有文件ID（包括文件夹内的文件）
   */
  const getAllFileIds = (currentFiles: T[]): string[] => {
    if (mode === "controlled" && externalGetAllFileIds) {
      return externalGetAllFileIds(currentFiles)
    }
    
    return currentFiles.reduce((acc: string[], file) => {
      acc.push(file.id)
      if (file.type === 'folder' && file.children) {
        acc.push(...getAllFileIds(file.children as T[]))
      }
      return acc
    }, [])
  }
  
  /**
   * 获取文件夹的所有子文件ID（包括子文件夹的文件）
   */
  const getFolderChildrenIds = (folder: T): string[] => {
    return folder.children?.reduce((ids: string[], child) => {
      ids.push(child.id)
      if (child.type === 'folder') ids.push(...getFolderChildrenIds(child as T))
      return ids
    }, [] as string[]) || []
  }
  
  /**
   * 获取文件夹的选中状态
   */
  const getFolderCheckState = (folder: T, selectedSet: Set<string>): boolean => {
    if (mode === "controlled" && externalGetFolderCheckState) {
      return externalGetFolderCheckState(folder, selectedSet)
    }
    
    if (!folder.children?.length) return false

    const selectedChildren = folder.children.filter(child => {
      if (child.type === 'folder') return getFolderCheckState(child as T, selectedSet)
      return selectedSet.has(child.id)
    })

    // 只要有任何子项被选中，就返回true
    return selectedChildren.length > 0
  }
  
  /**
   * 查找并更新所有父文件夹的状态
   */
  const updateParentFoldersState = (fileId: string, selectedSet: Set<string>) => {
    const updateFolder = (currentFiles: T[], parentPath: T[] = []): boolean => {
      for (const file of currentFiles) {
        if (file.type === 'folder' && file.children) {
          // 检查当前文件夹是否包含目标文件
          const containsTarget = file.children.some(child => child.id === fileId) ||
            file.children.some(child => 
              child.type === 'folder' && 
              updateFolder([child as T], [...parentPath, file])
            )

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
   * 处理文件选择状态变更
   */
  const handleFileSelect = (fileId: string, checked: boolean, file: T) => {
    if (mode === "controlled" && externalFileSelect) {
      return externalFileSelect(fileId, checked, file)
    }
    
    setInternalSelectedFiles(prev => {
      const newSet = new Set(prev)
      checked ? newSet.add(fileId) : newSet.delete(fileId)

      // 如果是文件夹，处理所有子文件
      if (file.type === 'folder') {
        const processChildren = (folder: T) => {
          folder.children?.forEach(child => {
            checked ? newSet.add(child.id) : newSet.delete(child.id)
            if (child.type === 'folder') processChildren(child as T)
          })
        }
        processChildren(file)
      }

      // 更新所有父文件夹的状态
      updateParentFoldersState(fileId, newSet)
      
      // 通知父组件（但不在渲染过程中）
      notifySelectionChange(newSet);
      
      return newSet
    })
  }
  
  /**
   * 处理文件夹切换展开/折叠
   */
  const handleToggleFolder = (folderId: string) => {
    if (mode === "controlled" && externalToggleFolder) {
      return externalToggleFolder(folderId)
    }
    
    setInternalExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId)
      
      // 通知父组件（但不在渲染过程中）
      notifyExpandChange(newSet);
      
      return newSet
    })
  }
  
  /**
   * 处理全选/全不选
   */
  const handleSelectAll = (checked: boolean) => {
    if (mode === "controlled" && externalSelectAll) {
      return externalSelectAll(checked)
    }
    
    setInternalSelectedFiles(() => {
      const newSet = new Set<string>()
      if (checked) {
        // 获取所有文件和文件夹的ID
        const getAllIds = (items: T[]): void => {
          items.forEach(item => {
            newSet.add(item.id)
            if (item.type === 'folder' && item.children) {
              getAllIds(item.children as T[])
            }
          })
        }
        getAllIds(files)
      }
      
      // 通知父组件（但不在渲染过程中）
      notifySelectionChange(newSet);
      
      return newSet
    })
  }
  
  /**
   * 处理反选
   */
  const handleInvertSelection = () => {
    if (mode === "controlled") {
      // 在受控模式下，反选操作应由父组件处理
      return
    }
    
    setInternalSelectedFiles(prev => {
      // 获取所有文件（不包括文件夹）
      const allFileOnlyIds = getAllFileOnlyIds(files)
      
      // 创建新的选择集合
      const newSet = new Set<string>()
      
      // 将当前未选中的文件添加到选择集合中，已选中的则不添加（实现反选）
      allFileOnlyIds.forEach(id => {
        if (!prev.has(id)) {
          newSet.add(id)
        }
      })
      
      // 更新所有文件夹的状态
      files.forEach(file => {
        if (file.type === 'folder') {
          updateParentFoldersState(file.id, newSet)
        }
      })
      
      // 通知父组件（但不在渲染过程中）
      notifySelectionChange(newSet);
      
      return newSet
    })
  }
  
  // 当文件列表变化时，可能需要更新选择状态
  useEffect(() => {
    if (mode === "uncontrolled" && files.length > 0) {
      // 确保所有文件夹的状态与子文件一致
      setInternalSelectedFiles(prev => {
        const newSet = new Set(prev)
        files.forEach(file => {
          if (file.type === 'folder') {
            updateParentFoldersState(file.id, newSet)
          }
        })
        return newSet
      })
    }
  }, [files, mode])
  
  // 当初始选择状态变化时，通知父组件，但确保在渲染完成后
  useEffect(() => {
    if (mode === "uncontrolled" && defaultSelectedFiles.size > 0) {
      notifySelectionChange(internalSelectedFiles);
    }
  }, [defaultSelectedFiles]);
  
  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    invertSelection: handleInvertSelection,
    getSelectedFiles: () => selectedFiles,
    getExpandedFolders: () => expandedFolders,
    selectAll: () => handleSelectAll(true),
    deselectAll: () => handleSelectAll(false)
  }), [selectedFiles, expandedFolders, handleInvertSelection, handleSelectAll]);

  /**
   * 渲染文件/文件夹列表项
   */
  const renderFileItem = (file: T, depth: number = 0): React.ReactNode => {
    const isFolder = file.type === 'folder'
    const isExpanded = expandedFolders.has(file.id)
    const checked = isFolder
      ? getFolderCheckState(file, selectedFiles)
      : selectedFiles.has(file.id)

    const defaultRow = (
      <TableRow key={file.id}>
        <TableCell className="w-[40px]">
          <Checkbox
            checked={checked}
            onCheckedChange={(checked) => handleFileSelect(file.id, checked as boolean, file)}
            disabled={disabled}
          />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center" style={{paddingLeft: `${depth * 20}px`}}>
            {isFolder ? (
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 p-0"
                onClick={() => handleToggleFolder(file.id)}
                disabled={disabled}
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
        {renderStatus && (
          <TableCell className="text-right">
            {renderStatus(file)}
          </TableCell>
        )}
      </TableRow>
    )

    return (
      <React.Fragment key={file.id}>
        {renderRow ? renderRow(file, defaultRow) : defaultRow}
        {isFolder && isExpanded && file.children?.map(child => 
          renderFileItem(child as T, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">
            <Checkbox
              checked={files.length > 0 && 
                // 只比较文件（不是文件夹）的数量，解决文件夹选中逻辑变更后的全选检测问题
                getAllFileOnlyIds(files).every(id => selectedFiles.has(id))}
              onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
              disabled={disabled || files.length === 0}
            />
          </TableHead>
          <TableHead>文件名</TableHead>
          <TableHead className="text-right">大小</TableHead>
          {customHeaders || (renderStatus && <TableHead className="text-right">状态</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map(file => renderFileItem(file))}
      </TableBody>
    </Table>
  )
}

// 使用forwardRef包装组件以支持ref
const FileTree = forwardRef(FileTreeComponent) as <T extends FileTreeItem>(
  props: FileTreeProps<T> & { ref?: React.ForwardedRef<FileTreeRef> }
) => React.ReactElement;

export { FileTree } 