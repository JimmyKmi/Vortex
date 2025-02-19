import {prisma} from '@/lib/prisma'

export interface SystemSettingDefinition {
  key: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: string | number | boolean;
  options?: string[] | { min?: number; max?: number };
  optionsMap?: Record<string, { name: string; description: string }>;
}

export const SYSTEM_SETTINGS: SystemSettingDefinition[] = [
  {
    key: 'MOTD',
    name: '系统公告',
    description: '登录后显示的系统消息',
    type: 'string',
    defaultValue: '',
  },
  {
    key: 'DEFAULT_USER_ENABLED',
    name: '默认账号状态',
    description: '新用户注册后的账号状态是否为启用',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'ALLOW_REGISTRATION',
    name: '允许普通注册',
    description: '是否允许用户通过邮箱密码方式注册（不影响第三方登录注册）',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'ALLOW_ZITADEL_LOGIN',
    name: '允许 Zitadel 登录',
    description: '是否允许用户使用 Zitadel 登录',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'ZITADEL_IDP_NAME',
    name: 'Zitadel 登录名称',
    description: '在登录界面显示的 Zitadel 登录按钮文字',
    type: 'string',
    defaultValue: 'Zitadel',
  },
  {
    key: 'UPLOAD_URL_EXPIRE_SECONDS',
    name: '上传链接有效期',
    description: '上传链接的有效期（秒）',
    type: 'number',
    defaultValue: 3600,
    options: { min: 300, max: 86400 }
  },
  {
    key: 'DOWNLOAD_URL_EXPIRE_SECONDS',
    name: '下载链接有效期',
    description: '文件下载链接的有效期（秒）',
    type: 'number',
    defaultValue: 3600,
    options: { min: 300, max: 86400 }
  },
]

// 通用的系统设置读取方法
export async function getSystemSetting<T extends string | boolean | number>(
  key: string
): Promise<T> {
  const settingDefinition = SYSTEM_SETTINGS.find(s => s.key === key)
  
  if (!settingDefinition) {
    throw new Error(`未找到系统设置: ${key}`)
  }

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    })

    if (!setting) {
      return settingDefinition.defaultValue as T
    }

    // 根据类型转换值
    switch (settingDefinition.type) {
      case 'boolean':
        return (setting.value.toLowerCase() === 'true') as T
      case 'number':
        return Number(setting.value) as T
      default:
        return setting.value as T
    }
  } catch (error) {
    console.error(`获取系统设置 ${key} 失败:`, error)
    return settingDefinition.defaultValue as T
  }
} 