export interface ValidationResult {
  isValid: boolean
  error?: string
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return {
      isValid: false,
      error: '邮箱不能为空'
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: '请输入合法的邮箱地址'
    }
  }

  if (email.length > 64) {
    return {
      isValid: false,
      error: '邮箱长度不能超过64位'
    }
  }

  return { isValid: true }
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password)
    return {
      isValid: false,
      error: '密码不能为空'
    }

  if (password.length < 8 || password.length > 64)
    return {
      isValid: false,
      error: '密码长度应在8-64位'
    }

  const hasLetterAndNumber = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,64}$/.test(password)
  if (!hasLetterAndNumber) {
    return {
      isValid: false,
      error: '密码需包含字母和数字'
    }
  }

  return { isValid: true }
}

export const validateName = (name: string): ValidationResult => {
  if (!name) {
    return {
      isValid: false,
      error: '昵称不能为空'
    }
  }

  if (name.length < 1 || name.length > 32) {
    return {
      isValid: false,
      error: '昵称长度应在1-32位'
    }
  }

  return { isValid: true }
}
