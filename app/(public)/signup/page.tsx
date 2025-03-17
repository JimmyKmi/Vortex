'use client'

import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import axios from 'axios'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthSettings } from '@/hooks/use-auth-settings'
import { registerSchema } from '@/lib/zod'

export default function SignUpPage() {
  const router = useRouter()
  const { allowRegistration } = useAuthSettings()

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: ''
  })
  const [isRegistering, setIsRegistering] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    general?: string
  }>({})

  // 如果注册关闭，重定向
  useEffect(() => {
    if (!allowRegistration) {
      toast.error('普通注册已关闭', {
        description: '系统当前不允许普通注册，请使用第三方登录'
      })
      router.replace('/signin')
    }
  }, [router, allowRegistration])

  const handleRegister = useCallback(async () => {
    try {
      // 使用 zod 验证
      const validatedData = registerSchema.parse(formData)

      setIsRegistering(true)
      setErrors({})

      const response = await axios.post('/api/register', validatedData)

      if (response.data.code === 'Success') {
        toast.success('注册成功', {
          description: '您的账号已创建成功，请登录'
        })
        router.push('/signin')
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        // Zod 验证错误
        const fieldErrors: any = {}
        error.errors.forEach((err: any) => {
          const field = err.path[0]
          fieldErrors[field] = err.message
        })
        setErrors(fieldErrors)
      } else {
        // API 错误
        const errorCode = error.response?.data?.code
        const errorMap: { [key: string]: string } = {
          UserAlreadyExists: '该邮箱已被注册',
          InvalidParams: '输入数据不合法',
          RegistrationClosed: '当前系统已关闭注册',
          AdapterError: '系统错误，请联系管理员',
          InternalServerError: '服务器错误，请稍后重试',
          default: '注册失败，请重试'
        }

        const errorMessage = errorCode
          ? errorMap[errorCode] || errorMap['default']
          : errorMap['default']

        setErrors({ general: errorMessage })
      }
    } finally {
      setIsRegistering(false)
    }
  }, [formData, router])

  // 处理回车键注册
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        void handleRegister()
      }
    },
    [handleRegister]
  )

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
    // 清除对应字段的错误
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field as keyof typeof errors]
      return newErrors
    })
  }

  return (
    <Layout width="min" buttonType="back" title="注册" backPath="/signin">
      {errors.general && (
        <Alert variant="destructive">
          <AlertTitle>注册失败</AlertTitle>
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label>昵称</Label>
        <Input
          type="text"
          placeholder="请输入您的昵称"
          value={formData.name}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <div className="text-red-500 text-sm">{errors.name}</div>}
      </div>

      <div className="space-y-2">
        <Label>邮箱</Label>
        <Input
          type="email"
          placeholder="请输入您的邮箱"
          value={formData.email}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <div className="text-red-500 text-sm">{errors.email}</div>}
      </div>

      <div className="space-y-2">
        <Label>密码</Label>
        <Input
          type="password"
          placeholder="请输入8-32位密码"
          value={formData.password}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange('password')}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && <div className="text-red-500 text-sm">{errors.password}</div>}
      </div>
      <Button onClick={handleRegister} disabled={isRegistering} className="w-full">
        {isRegistering ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            注册中...
          </span>
        ) : (
          '注册'
        )}
      </Button>

      <div className="text-center text-sm text-gray-500">
        已有账号？
        <Link href="/signin" className="text-primary hover:underline ml-1">
          立即登录
        </Link>
      </div>
    </Layout>
  )
}
