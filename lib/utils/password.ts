import bcrypt from 'bcryptjs'

/**
 * 对密码进行加盐和哈希处理
 * @param password 原始密码
 * @returns 加盐和哈希后的密码
 */
export function saltAndHashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

/**
 * 验证密码是否匹配
 * @param plainPassword 原始密码
 * @param hashedPassword 已哈希的密码
 * @returns 是否匹配
 */
export function comparePassword(plainPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword)
} 