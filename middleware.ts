import { auth } from '@/auth'
import { NextResponse, NextRequest } from 'next/server'
import { UserRole } from '@/lib/roles'
import { isAdminPath, isUserPath, isAuthPath } from '@/lib/utils/route'
import { ResponseThrow } from '@/lib/utils/response'

/**
 * 创建错误响应
 */
function createErrorResponse(error: string, pathname: string, req: NextRequest) {
  if (pathname.startsWith('/api')) ResponseThrow(error)
  return NextResponse.redirect(new URL('/', req.nextUrl.origin))
}

/**
 * 中间件配置说明：
 *
 * 1. 身份验证架构：
 *    - 用户身份会话（user、admin）：使用 NextAuth 实现，完全由 middleware 鉴权
 *    - 传输身份会话（no-login）：使用自定义会话管理
 *      - 前端：调用 API 时自动跳转
 *      - 后端：API 鉴权
 *
 * 2. 访问控制：
 *    - 权限控制：未登录用户禁止访问需要登录的页面
 *    - 登录状态控制：已登录用户禁止访问登录/注册页面
 *    - 管理员权限：验证管理员角色访问权限
 */
export default auth(async req => {
  const isLoggedIn = !!req.auth?.user
  const { pathname } = req.nextUrl

  if (isLoggedIn && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  if (!isLoggedIn && isUserPath(pathname)) {
    const signInUrl = new URL('/signin', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }

  if (isAdminPath(pathname) && req.auth?.user?.role !== UserRole.ADMIN) {
    return createErrorResponse('Unauthorized', pathname, req)
  }

  return NextResponse.next()
})
