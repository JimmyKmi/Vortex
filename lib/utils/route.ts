// 管理员路径
const ADMIN_PATH_PREFIXES = [
  '/api/management',
  '/settings/platform'
] as const

// 用户路径
const USER_PATH_PREFIXES = [
  '/api/account',
  '/api/transfer-codes',
  '/settings'
] as const

// 认证路径
const AUTH_PATHS_PREFIXES = [
  '/signin',
  '/signup'
] as const

/**
 * 检查是否是内部API路径
 * @param pathname 路径
 * @returns 是否是内部API路径
 */
export function isInternalApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/internal")
}

/**
 * 检查路径是否需要管理员权限
 * @param pathname 路径
 * @returns 是否需要管理员权限
 */
export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

/**
 * 检查路径是否需要用户登录
 * @param pathname 路径
 * @returns 是否需要用户登录
 */
export function isUserPath(pathname: string): boolean {
  return USER_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

/**
 * 检查是否是认证页面
 * @param pathname 路径
 * @returns 是否是认证页面
 */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS_PREFIXES.some(prefix => pathname.startsWith(prefix))
} 