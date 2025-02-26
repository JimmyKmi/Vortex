'use client'

import {useState, useEffect} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import Layout from '@/components/layout'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Label} from '@/components/ui/label'
import {toast} from 'sonner'
import {signIn} from 'next-auth/react'
import {useAuthSettings} from '@/hooks/use-auth-settings'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {allowZitadel, allowRegistration, zitadelIdpName} = useAuthSettings()
  const [error, setError] = useState<string>('')
  const [isPending, setIsPending] = useState(false)
  const [isZitadelLoading, setIsZitadelLoading] = useState(false)

  // 检查URL中的错误参数
  useEffect(() => {
    const error = searchParams.get('code')
    if (error) {
      const errorMap: { [key: string]: string } = {
        'OAuthAccountNotLinked': '此邮箱已被其他登录方式使用',
        'EmailUnverified': '邮箱未验证',
        'AccountUnused': '账号未启用，请联系管理员启用',
        'Callback': 'OIDC登录失败，请重试',
        'default': '登录失败，请重试'
      }
      const errorMessage = errorMap[error] || errorMap['default']
      setError(errorMessage)
      toast.error(errorMessage, {
        description: '请检查后重试'
      })
    }
  }, [searchParams])

  async function onSubmit(formData: FormData) {
    setIsPending(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.get('email') as string,
        password: formData.get('password') as string
      })

      if (!result) {
        setError('登录失败，请重试1')
        return
      }

      if (result.code) {
        // 错误类型映射
        const errorMap: { [key: string]: string } = {
          'MissingCredentials': '请输入邮箱和密码',
          'InvalidInputFormat': '输入格式不正确',
          'UserNotFound': '用户不存在',
          'IncorrectPassword': '密码错误',
          'AccountUnused': '账号未启用，请联系管理员启用',
          'default': '未知错误，请重试'
        }

        // 显示更具体的错误信息
        const errorMessage = errorMap[result.code] || errorMap['default']
        setError(errorMessage)
        toast.error(errorMessage, {
          description: '请检查输入信息后重试'
        })
      } else {
        toast.success('登录成功')
        router.push(result.url || '/')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setIsPending(false)
    }
  }

  const handleZitadelLogin = async () => {
    try {
      setIsZitadelLoading(true)
      setError('')
      await signIn('zitadel', {
        redirect: true,
        redirectTo: window.location.origin
      })
    } catch (error) {
      toast.error("Zitadel登录失败", {
        description: "登录过程中发生错误，请稍后重试"
      })
    } finally {
      setIsZitadelLoading(false)
    }
  }

  return (
    <Layout width="min" title="登录" buttonType="home" backPath="/">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>登录失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form action={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>邮箱</Label>
          <Input
            name="email"
            type="email"
            placeholder="请输入邮箱"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>密码</Label>
          <Input
            name="password"
            type="password"
            placeholder="请输入密码"
            required
            disabled={isPending}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center">
                处理中
                <svg className="animate-spin h-5 w-5 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none"
                     viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              </span>
          ) : '登录'}
        </Button>
      </form>

      {(allowZitadel || allowRegistration) && (<div className="my-4 flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-gray-500">或</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>)}

      <div className="space-y-4">
        {allowRegistration && (
          <Link href="/signup" className="w-full">
            <Button variant="outline" className="w-full">
              创建新账号
            </Button>
          </Link>
        )}

        {allowZitadel && (
          <Button
            onClick={handleZitadelLogin}
            variant="outline"
            className="w-full"
            disabled={isZitadelLoading}
          >
            {isZitadelLoading ? (
              <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none"
                       viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                            strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                {zitadelIdpName} 登录中...
                </span>
            ) : `使用 ${zitadelIdpName} 登录`}
          </Button>
        )}
      </div>
    </Layout>
  )
}
