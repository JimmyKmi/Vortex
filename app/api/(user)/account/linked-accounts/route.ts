import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({
          code: 'Unauthorized'
        }),
        {
          status: 401
        }
      )
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        provider: true,
        type: true,
        providerAccountId: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      code: 'Success',
      data: accounts
    })
  } catch (error) {
    logger.error('[GET_LINKED_ACCOUNTS]', error)
    return new NextResponse(
      JSON.stringify({
        code: 'InternalServerError'
      }),
      {
        status: 500
      }
    )
  }
}
