import { NextResponse } from 'next/server'
import { getSystemSetting } from '@/lib/config/system-settings'
import logger from '@/lib/utils/logger'

// 定义可以公开访问的设置项
const PUBLIC_SETTINGS = ['ALLOW_ZITADEL_LOGIN', 'ALLOW_REGISTRATION', 'ZITADEL_IDP_NAME', 'MOTD']

export async function GET() {
  try {
    const settings = await Promise.all(
      PUBLIC_SETTINGS.map(async (key) => {
        // 根据设置项的类型获取值
        const value =
          key === 'ZITADEL_IDP_NAME' || key === 'MOTD' ? await getSystemSetting<string>(key) : await getSystemSetting<boolean>(key)
        return { key, value }
      })
    )

    const settingsObject = settings.reduce(
      (acc, { key, value }) => {
        acc[key] = value
        return acc
      },
      {} as Record<string, string | boolean>
    )

    return NextResponse.json(settingsObject)
  } catch (error) {
    logger.error('获取公开设置失败:', error)
    return NextResponse.json({ error: 'ServerError' }, { status: 500 })
  }
}
