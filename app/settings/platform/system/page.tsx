'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { Input } from '@/components/ui/input'
import { Loader2, Save } from 'lucide-react'
import { SYSTEM_SETTINGS, SystemSettingDefinition } from '@/lib/config/system-settings'
import { SettingsTitle } from '@/components/settings/settings-title'
import { UserRole, ROLE_DEFINITIONS } from '@/lib/roles'
import { useSession } from 'next-auth/react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

export default function SystemSettingsPage() {
  const { data: session, status } = useSession()
  const [system_settings, setSystemSettings] = useState<Record<string, string>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // 如果不是管理员，显示 404
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== UserRole.ADMIN) {
      notFound()
    }
  }, [status, session])

  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        setIsLoadingSettings(true)
        const response = await axios.get('/api/management/system-settings')
        const settings = response.data.reduce((acc: Record<string, string>, setting: any) => {
          const settingDefinition = SYSTEM_SETTINGS.find((s) => s.key === setting.key)
          if (settingDefinition) {
            if (settingDefinition.type === 'boolean') {
              acc[setting.key] = setting.value === 'true' ? 'true' : 'false'
            } else {
              acc[setting.key] = setting.value
            }
          }
          return acc
        }, {})
        setSystemSettings(settings)
      } catch {
        toast.error('获取系统设置失败', {
          description: '无法加载系统设置'
        })
      } finally {
        // 确保在数据处理完成后再关闭加载状态
        setIsLoadingSettings(false)
      }
    }
    void fetchSystemSettings()
  }, [])

  const handleSettingChange = (key: string, value: string) => {
    const settingDefinition = SYSTEM_SETTINGS.find((s) => s.key === key)
    if (settingDefinition?.type === 'boolean') {
      setEditedSettings((prev) => ({
        ...prev,
        [key]: value === 'true' ? 'true' : 'false'
      }))
    } else {
      setEditedSettings((prev) => ({ ...prev, [key]: value }))
    }
  }

  const handleSaveSettings = async () => {
    if (Object.keys(editedSettings).length === 0) return

    try {
      setIsSaving(true)
      const updatePromises = Object.entries(editedSettings).map(([key, value]) => {
        const settingDefinition = SYSTEM_SETTINGS.find((s) => s.key === key)
        if (!settingDefinition) {
          throw new Error(`未找到设置项: ${key}`)
        }

        return axios.put('/api/management/system-settings', { key, value })
      })

      await Promise.all(updatePromises)

      setSystemSettings((prev) => ({ ...prev, ...editedSettings }))
      setEditedSettings({})

      toast.success('系统设置已更新', {
        description: '所有修改已保存成功'
      })
    } catch (error) {
      console.error('保存设置时发生错误:', error)
      toast.error('更新失败', {
        description: error instanceof Error ? error.message : '无法更新系统设置'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderSettingInput = (setting: SystemSettingDefinition) => {
    const currentValue =
      editedSettings[setting.key] ??
      system_settings[setting.key] ??
      (setting.type === 'boolean' ? String(setting.defaultValue) : setting.defaultValue)

    switch (setting.type) {
      case 'boolean':
        return (
          <Select value={currentValue} onValueChange={(value) => handleSettingChange(setting.key, value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">是</SelectItem>
              <SelectItem value="false">否</SelectItem>
            </SelectContent>
          </Select>
        )
      case 'string':
        if (setting.options && Array.isArray(setting.options)) {
          return (
            <Select value={String(currentValue)} onValueChange={(value) => handleSettingChange(setting.key, value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择值" />
              </SelectTrigger>
              <SelectContent>
                {setting.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {setting.optionsMap?.[option]?.name || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        return (
          <Input
            value={String(currentValue)}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            placeholder="输入值"
          />
        )
      default:
        return (
          <Input
            type="number"
            value={String(currentValue)}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            placeholder="输入数值"
          />
        )
    }
  }

  const hasChanges = Object.keys(editedSettings).length > 0

  // 如果正在加载会话或系统设置，显示加载状态
  if (status === 'loading' || isLoadingSettings) {
    return (
      <SettingsLayout title="系统设置">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-px w-full mt-3" />
          </div>

          <div className="relative">
            <div className="rounded-md border">
              <div className="p-4">
                {/* 表头骨架屏 */}
                <div className="flex border-b pb-4">
                  <Skeleton className="h-4 w-32 mr-8" />
                  <Skeleton className="h-4 w-32 mr-8" />
                  <Skeleton className="h-4 w-32" />
                </div>

                {/* 表格内容骨架屏 - 生成5行 */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start py-4 border-b last:border-0">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex-1">
                      <Skeleton className="h-9 w-48" />
                    </div>
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 保存按钮骨架屏 */}
            <div className="flex justify-end mt-4">
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
        </div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title="系统设置">
      <SettingsTitle title="系统设置" description="管理系统的全局配置" />
      <div className="relative space-y-4">
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设置名称</TableHead>
                <TableHead>设置值</TableHead>
                <TableHead>默认值</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SYSTEM_SETTINGS.map((setting) => (
                <TableRow key={setting.key}>
                  <TableCell>
                    <div className="font-medium">{setting.name}</div>
                    <div className="text-xs text-muted-foreground">{setting.description}</div>
                  </TableCell>
                  <TableCell>{renderSettingInput(setting)}</TableCell>
                  <TableCell className={!setting.defaultValue ? 'text-muted-foreground' : ''}>
                    {setting.key === 'DEFAULT_USER_ROLE'
                      ? ROLE_DEFINITIONS[setting.defaultValue as UserRole].name
                      : setting.type === 'boolean'
                        ? String(setting.defaultValue) === 'true'
                          ? '是'
                          : '否'
                        : setting.defaultValue
                          ? String(setting.defaultValue)
                          : '无'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveSettings} disabled={!hasChanges || isSaving} className="w-48 right-0">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存更改
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  )
}
