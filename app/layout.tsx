import type { Metadata } from 'next'
import React from 'react'
import '../styles/globals.scss'
import { Geist, Azeret_Mono as Geist_Mono } from 'next/font/google'
import Providers from '@/app/providers'
import { getAppPublicSettings } from '@/lib/env'
import { Toaster } from '@/components/ui/sonner'
import { TasksDaemon } from '@/app/components/TasksDaemon'

// 强制导入初始化模块，确保在服务器启动时自动执行初始化
import './_init'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppPublicSettings()

  return {
    title: {
      default: settings.appName,
      template: `%s | ${settings.appName}`
    },
    description: 'File Transfer System'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <TasksDaemon />
        </Providers>
      </body>
    </html>
  )
}
