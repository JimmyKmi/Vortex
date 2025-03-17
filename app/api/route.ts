import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    name: 'Jimmy File API',
    version: '0.1.0',
    status: 'ok',
    time: new Date().toISOString()
  })
}
