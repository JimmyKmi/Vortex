/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小(字节)
 * @returns {string} 格式化后的文件大小(KB)
 */
export const formatFileSize = (bytes: number): string => {
  const kb = bytes / 1024
  const formatted = kb.toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })
  // 如果长度超过 10 个字符，截断并添加省略号
  return (formatted.length > 10 ? formatted.slice(0, 8) + '...' : formatted) + ' KB'
} 