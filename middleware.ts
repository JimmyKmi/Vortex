import {auth} from "@/auth"
import {NextResponse, NextRequest} from "next/server"
import {UserRole} from "@/lib/roles"
import {
  isAdminPath,
  isUserPath,
  isAuthPath,
  isInternalApiPath
} from "@/lib/utils/route"
import {ResponseThrow} from "@/lib/utils/response";

/**
 * 创建错误响应
 */
function createErrorResponse(error: string, pathname: string, req: NextRequest) {
  if (pathname.startsWith('/api')) ResponseThrow(error)
  return NextResponse.redirect(new URL('/', req.nextUrl.origin))
}

/**
 * 验证传输会话
 */
// async function validateTransferSession(sessionId: string, pathname: string, req: NextRequest) {
//   try {
//     const response = await fetch('http://127.0.0.1:3000/api/internal/validate-transfer-session', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Cookie': req.headers.get('cookie') || ''
//       },
//       body: JSON.stringify({sessionId, pathname})
//     })
//
//     const result = await response.json()
//     return result.valid
//   } catch {
//     return false
//   }
// }

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
 *    - 内部 API 访问限制：仅允许本地请求
 *    - 登录状态控制：已登录用户禁止访问登录/注册页面
 *    - 权限控制：未登录用户禁止访问用户页面
 *    - 管理员权限：验证管理员角色访问权限
 */
export default auth(async (req) => {
  const isLoggedIn = !!req.auth?.user
  const {pathname} = req.nextUrl

  // 内部 API 访问限制
  if (isInternalApiPath(pathname) && !req.headers.get('host')?.startsWith('127.0.0.1:')) {
    return createErrorResponse("NotFound", pathname, req)
  }

  // 登录及用户页
  if (isLoggedIn && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  if (!isLoggedIn && isUserPath(pathname)) {
    const signInUrl = new URL('/signin', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }

  if (isAdminPath(pathname) && req.auth?.user?.role !== UserRole.ADMIN) {
    return createErrorResponse("Unauthorized", pathname, req)
  }

  return NextResponse.next()
})