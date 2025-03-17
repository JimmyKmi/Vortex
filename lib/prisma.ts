import { PrismaClient } from '@prisma/client'
import { NODE_ENV } from '@/lib/env'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

// 注意：在全局声明中必须使用var，因为这些属性将附加到globalThis对象上
// 使用let或const在全局声明中不会正确地挂载到globalThis对象
declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
