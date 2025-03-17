import { PrismaClient } from '@prisma/client'
import { NODE_ENV } from '@/lib/env'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
