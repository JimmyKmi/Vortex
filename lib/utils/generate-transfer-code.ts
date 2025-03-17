import { prisma } from '@/lib/prisma'

// 生成6位随机传输码
export async function generateTransferCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 去掉容易混淆的字符
  let code: string
  let isUnique = false

  do {
    code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // 检查是否已存在
    const existing = await prisma.transferCode.findUnique({
      where: { code }
    })
    isUnique = !existing
  } while (!isUnique)

  return code
}
