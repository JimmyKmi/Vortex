export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface RoleDefinition {
  name: string
  description: string
  level: number // 权限等级，数字越大权限越高
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  [UserRole.ADMIN]: {
    name: '管理员',
    description: '系统管理员，拥有所有权限',
    level: 100
  },
  [UserRole.USER]: {
    name: '普通用户',
    description: '普通用户，拥有基本权限',
    level: 10
  }
}

// // 角色比较函数
// export function hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
//   return ROLE_DEFINITIONS[userRole].level >= ROLE_DEFINITIONS[requiredRole].level
// }
//
// // 获取角色显示名称
// export function getRoleName(role: UserRole): string {
//   return ROLE_DEFINITIONS[role].name
// }
//
// // 检查用户是否有特定权限
// export function hasPermission(role: UserRole, permission: keyof Omit<RoleDefinition, 'name' | 'description' | 'level'>): boolean {
//   return ROLE_DEFINITIONS[role][permission]
// }
//
// // 类型保护函数
// export function isValidRole(role: string): role is UserRole {
//   return Object.values(UserRole).includes(role as UserRole)
// }
