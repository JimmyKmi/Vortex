import { ResponseSuccess } from '@/lib/utils/response'
import { DEFAULT_APP_NAME, DEFAULT_FOOTER, DEFAULT_FOOTER_LINK } from '@/lib/env'

export async function GET() {
  // 这些配置可以在运行时从环境变量中获取
  const config = {
    appName: process.env.APP_NAME || DEFAULT_APP_NAME,
    footer: process.env.APP_FOOTER || DEFAULT_FOOTER,
    footerLink: process.env.APP_FOOTER_LINK || DEFAULT_FOOTER_LINK,
  }
  
  return ResponseSuccess(config)
} 