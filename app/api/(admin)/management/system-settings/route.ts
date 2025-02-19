import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_SETTINGS } from '@/lib/config/system-settings'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.systemSettings.findMany()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('获取系统设置失败:', error)
    return NextResponse.json({ error: '获取系统设置失败' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { key, value } = await req.json()
    
    // 验证设置项是否合法
    const settingDefinition = SYSTEM_SETTINGS.find(s => s.key === key)
    if (!settingDefinition) {
      return NextResponse.json({ error: '无效的设置项' }, { status: 400 })
    }

    // 根据类型转换值
    let processedValue: string
    switch (settingDefinition.type) {
      case 'boolean':
        processedValue = String(value)
        break
      case 'string':
        if (settingDefinition.options && 
            Array.isArray(settingDefinition.options) && 
            !settingDefinition.options.includes(String(value))) {
          return NextResponse.json({ error: '无效的选项值' }, { status: 400 })
        }
        processedValue = String(value)
        break
      default:
        processedValue = String(value)
    }

    const updatedSetting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value: processedValue },
      create: { key, value: processedValue }
    })

    return NextResponse.json(updatedSetting)
  } catch (error) {
    console.error('更新系统设置失败:', error)
    return NextResponse.json({ error: '更新系统设置失败' }, { status: 500 })
  }
}