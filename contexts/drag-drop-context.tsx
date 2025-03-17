import React, { createContext, useContext, useCallback, ReactNode } from 'react'

interface DragDropContextType {
  enableDragDrop: (onDrop: (files: File[]) => void) => void
  disableDragDrop: () => void
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined)

export function DragDropProvider({ children }: { children: ReactNode }) {
  const [dropCallback, setDropCallback] = React.useState<((files: File[]) => void) | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragCounter = React.useRef(0)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounter.current = 0

      if (!dropCallback || !e.dataTransfer) return

      // 获取所有的文件和文件夹条目
      const items = Array.from(e.dataTransfer.items)
      const files: File[] = []

      // 处理文件系统条目
      const processEntry = async (entry: FileSystemEntry): Promise<void> => {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve) => {
            ;(entry as FileSystemFileEntry).file((file) => {
              // 添加相对路径属性
              Object.defineProperty(file, 'webkitRelativePath', {
                value: entry.fullPath.slice(1) // 移除开头的斜杠
              })
              resolve(file)
            })
          })
          files.push(file)
        } else if (entry.isDirectory) {
          const reader = (entry as FileSystemDirectoryEntry).createReader()
          const entries = await new Promise<FileSystemEntry[]>((resolve) => {
            reader.readEntries((entries) => resolve(entries))
          })
          await Promise.all(entries.map((entry) => processEntry(entry)))
        }
      }

      try {
        // 处理所有拖拽的项目
        await Promise.all(
          items.map((item) => {
            const entry = item.webkitGetAsEntry()
            if (entry) {
              return processEntry(entry)
            }
            // 如果不支持 webkitGetAsEntry，则尝试直接获取文件
            const file = item.getAsFile()
            if (file) {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: file.name
              })
              files.push(file)
            }
            return Promise.resolve()
          })
        )

        // 如果没有文件被添加，可能是因为浏览器不支持文件系统API
        if (files.length === 0 && e.dataTransfer.files.length > 0) {
          Array.from(e.dataTransfer.files).forEach((file) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: file.name
            })
            files.push(file)
          })
        }

        dropCallback(files)
      } catch (error) {
        console.error('Error processing dropped files:', error)
        // 降级处理：直接使用文件列表
        const fallbackFiles = Array.from(e.dataTransfer.files)
        fallbackFiles.forEach((file) => {
          if (!(file as any).webkitRelativePath) {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: file.name
            })
          }
        })
        dropCallback(fallbackFiles)
      }
    },
    [dropCallback]
  )

  React.useEffect(() => {
    if (dropCallback) {
      document.addEventListener('dragenter', handleDragEnter)
      document.addEventListener('dragleave', handleDragLeave)
      document.addEventListener('dragover', handleDragOver)
      document.addEventListener('drop', handleDrop)

      return () => {
        document.removeEventListener('dragenter', handleDragEnter)
        document.removeEventListener('dragleave', handleDragLeave)
        document.removeEventListener('dragover', handleDragOver)
        document.removeEventListener('drop', handleDrop)
      }
    }
  }, [dropCallback, handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  const enableDragDrop = useCallback((onDrop: (files: File[]) => void) => {
    setDropCallback(() => onDrop)
  }, [])

  const disableDragDrop = useCallback(() => {
    setDropCallback(null)
    setIsDragging(false)
    dragCounter.current = 0
  }, [])

  return (
    <DragDropContext.Provider value={{ enableDragDrop, disableDragDrop }}>
      {children}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          backdropFilter: 'blur(8px)',
          transition: 'all .1s',
          opacity: isDragging ? 1 : 0
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-8 rounded-lg border-2 border-dashed border-primary">
            <p className="text-xl text-primary tracking-wider">释放鼠标即可</p>
          </div>
        </div>
      </div>
    </DragDropContext.Provider>
  )
}

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}
