'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validatePassword } from '@/lib/validators'
import { SettingsTitle } from '@/components/settings/settings-title'
import { useAuthSettings } from '@/hooks/use-auth-settings'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface LinkedAccount {
  id: string
  provider: string
  type: string
  providerAccountId: string
  createdAt: string
}

export default function AccountSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { zitadelIdpName } = useAuthSettings()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [errors, setErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
    }
  }, [session, status, router])

  const fetchLinkedAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await axios.get('/api/account/linked-accounts')
      if (response.data.code === 'Success') {
        setLinkedAccounts(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch linked accounts:', error)
      toast.error('获取关联账号失败')
    } finally {
      setLoadingAccounts(false)
    }
  }

  useEffect(() => {
    if (session) void fetchLinkedAccounts()
  }, [session])

  const validateForm = () => {
    const newErrors: {
      newPassword?: string
      confirmPassword?: string
    } = {}

    // 验证新密码
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      newErrors.newPassword = passwordValidation.error
    }

    // 验证确认密码
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不匹配'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsLoading(true)
      await axios.post('/api/account/set-password', {
        newPassword
      })

      toast.success('密码已更新', {
        description: '您的密码已成功修改'
      })

      // 清空表单
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})

      // 刷新关联账号列表
      await fetchLinkedAccounts()
    } catch (error: any) {
      toast.error('更新失败', {
        description: error.response?.data?.code || '密码更新失败，请重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      // 确保不会删除最后一个关联账号
      if (linkedAccounts.length <= 1) {
        toast.error('操作失败', {
          description: '必须至少保留一个登录方式'
        })
        return
      }

      setDeletingAccount(accountId)
      const response = await axios.delete(`/api/account/linked-accounts/${accountId}`)
      if (response.data.code === 'Success') {
        toast.success('删除成功', {
          description: '登录方式已成功删除'
        })
        setLinkedAccounts((prev) => prev.filter((account) => account.id !== accountId))
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '删除失败，请重试'
      toast.error('删除失败', {
        description: message
      })
    } finally {
      setDeletingAccount(null)
    }
  }

  // 完整页面骨架屏
  if (status === 'loading') {
    return (
      <SettingsLayout title="账号设置">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="space-y-8">
          <div>
            <Skeleton className="h-6 w-20 mb-4" />
            <div className="rounded-md border p-4">
              <div className="flex mb-4 pb-2 border-b">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24 mr-6" />
                  ))}
              </div>
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center py-3 border-b last:border-0">
                    {Array(5)
                      .fill(0)
                      .map((_, j) => (
                        <Skeleton key={j} className="h-4 w-24 mr-6" />
                      ))}
                  </div>
                ))}
            </div>
          </div>

          <div>
            <Skeleton className="h-6 w-20 mb-4" />
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">
              <div className="w-full sm:max-w-[280px] grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="w-full sm:max-w-[280px] grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex items-end">
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout title="账号设置">
      <SettingsTitle title="账号设置" description="管理您的账号信息和安全设置" />

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium mb-4">关联账号</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>登录方式</TableHead>
                  <TableHead>账号ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>关联时间</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAccounts ? (
                  // 关联账号加载时的骨架屏
                  <>
                    {Array(3)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-36" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                ) : (
                  <>
                    {linkedAccounts.map((account) => (
                      <TableRow key={account.id} className={`${deletingAccount === account.id ? 'opacity-50' : ''}`}>
                        <TableCell className="font-medium capitalize">
                          {account.provider === 'zitadel' ? zitadelIdpName : account.provider}
                        </TableCell>
                        <TableCell>{account.providerAccountId}</TableCell>
                        <TableCell className="capitalize">{account.type}</TableCell>
                        <TableCell>{format(new Date(account.createdAt), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                disabled={deletingAccount === account.id || linkedAccounts.length <= 1}
                                title={linkedAccounts.length <= 1 ? '至少保留一个登录方式' : '删除此登录方式'}
                              >
                                {deletingAccount === account.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除登录方式？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  删除后将无法使用该方式登录，如需使用需要重新关联。
                                  {linkedAccounts.length <= 2 && (
                                    <div className="mt-2 text-amber-600 font-medium">
                                      删除此登录方式后，您将只剩下最后一个登录方式。
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loadingAccounts && linkedAccounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          暂无关联账号
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          {!loadingAccounts && linkedAccounts.length === 1 && (
            <div className="mt-2 text-sm text-amber-600">注意：必须至少保留一个登录方式，否则将无法登录系统。</div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium mb-4">修改密码</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">
            <div className="w-full sm:max-w-[280px] grid gap-2">
              <Label htmlFor="new-password">设置新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (errors.newPassword) {
                    setErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.newPassword
                      return newErrors
                    })
                  }
                }}
                className={errors.newPassword ? 'border-red-500' : ''}
                placeholder="P@ssuu0rcl"
                required
              />
              {errors.newPassword && <div className="text-red-500 text-sm">{errors.newPassword}</div>}
            </div>
            <div className="w-full sm:max-w-[280px] grid gap-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) {
                    setErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.confirmPassword
                      return newErrors
                    })
                  }
                }}
                className={errors.confirmPassword ? 'border-red-500' : ''}
                placeholder="P@ssuu0rcl"
                required
              />
              {errors.confirmPassword && <div className="text-red-500 text-sm">{errors.confirmPassword}</div>}
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '更新中...' : '更新密码'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SettingsLayout>
  )
}
