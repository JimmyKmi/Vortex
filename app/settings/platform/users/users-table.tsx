'use client'

import React from 'react'
import { signOut } from '@/auth'
import { UserRole, ROLE_DEFINITIONS } from '@/lib/roles'
import useSWR, { useSWRConfig } from 'swr'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Session } from 'next-auth'
import { cn } from '@/lib/utils'

interface UserAccount {
  id: string
  name: string | null
  email: string | null
  role: UserRole
  enabled: boolean
}

interface UsersTableProps {
  session: Session | null
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

// 格式化用户标识显示
const formatUserIdentifier = (user: UserAccount): string => {
  return user.name ? `${user.name} (${user.id})` : user.id
}

export function UsersTable({ session }: UsersTableProps) {
  const { mutate } = useSWRConfig()

  const {
    data: users,
    error: usersError,
    isLoading: isUsersLoading
  } = useSWR<UserAccount[]>('/api/management/users', fetcher)

  const handleUserRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await axios.put('/api/management/users', {
        userId,
        role: newRole,
        forceRelogin: true
      })

      // 更新本地用户列表
      await mutate(
        '/api/management/users',
        (currentUsers: UserAccount[] | undefined) =>
          currentUsers ? currentUsers.map((user) => (user.id === userId ? { ...user, role: newRole } : user)) : [],
        { revalidate: false }
      )

      // 如果修改的是当前用户，强制退出
      if (userId === session?.user?.id) {
        toast.error('账号状态变更', {
          description: '您的角色已被修改，请重新登录'
        })
        await signOut({ redirect: true })
        return
      }

      const targetUser = users?.find((u) => u.id === userId)
      toast.success('用户状态已更新', {
        description: `用户 ${targetUser ? formatUserIdentifier(targetUser) : userId} 的角色已更改为 ${ROLE_DEFINITIONS[newRole].name}`
      })
    } catch {
      toast.error('更新失败', {
        description: '无法更新用户角色'
      })
    }
  }

  const handleUserStatusChange = async (userId: string, enabled: boolean) => {
    try {
      await axios.put('/api/management/users', {
        userId,
        enabled,
        forceRelogin: !enabled // 禁用时强制退出
      })

      // 更新本地用户列表
      await mutate(
        '/api/management/users',
        (currentUsers: UserAccount[] | undefined) =>
          currentUsers ? currentUsers.map((user) => (user.id === userId ? { ...user, enabled } : user)) : [],
        { revalidate: false }
      )

      // 如果修改的是当前用户，强制退出
      if (userId === session?.user?.id && !enabled) {
        toast.error('账号状态变更', {
          description: '您的账号已被禁用，请联系管理员'
        })
        await signOut({ redirect: true })
        return
      }

      const targetUser = users?.find((u) => u.id === userId)
      toast.success('用户状态已更新', {
        description: `用户 ${targetUser ? formatUserIdentifier(targetUser) : userId} 已${enabled ? '启用' : '禁用'}`
      })
    } catch {
      toast.error('更新失败', {
        description: '无法更新用户状态'
      })
    }
  }

  const handleUserDelete = async (userId: string) => {
    try {
      await axios.delete(`/api/management/users/${userId}`)

      await mutate(
        '/api/management/users',
        (currentUsers: UserAccount[] | undefined) =>
          currentUsers ? currentUsers.filter((user) => user.id !== userId) : [],
        { revalidate: false }
      )

      const targetUser = users?.find((u) => u.id === userId)
      toast.success('用户已删除', {
        description: `用户 ${targetUser ? formatUserIdentifier(targetUser) : userId} 已成功删除`
      })
    } catch {
      toast.error('删除失败', {
        description: '无法删除用户'
      })
    }
  }

  if (isUsersLoading)
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    )

  if (usersError) return <div className="text-red-500">加载用户列表失败</div>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>用户信息</TableHead>
          <TableHead>用户ID</TableHead>
          <TableHead>用户角色</TableHead>
          <TableHead>账户启用</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex flex-col space-y-1">
                <span className="font-medium">{user.name || '未设置'}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground font-mono">{user.id}</TableCell>
            <TableCell>
              <Select
                onValueChange={(value) => handleUserRoleChange(user.id, value as UserRole)}
                defaultValue={user.role}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="选择用户角色" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_DEFINITIONS).map(([role, def]) => (
                    <SelectItem key={role} value={role}>
                      {def.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Button
                variant="default"
                size="sm"
                className={cn(user.enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700')}
                onClick={() => handleUserStatusChange(user.id, !user.enabled)}
              >
                {user.enabled ? '已启用' : '已禁用'}
              </Button>
            </TableCell>
            <TableCell className="flex space-x-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
                  <AlertDialogDescription>此操作不可撤销。将永久删除该用户账号。</AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleUserDelete(user.id)}>删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
