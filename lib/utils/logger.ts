import pino from 'pino'
import path from 'path'
import fs from 'fs'

// 确保日志目录存在
const LOG_DIR = path.join(process.cwd(), 'data', 'logs')
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
} catch (err) {
  console.error('Failed to create log directory:', err)
}

// 日志配置
const defaultLogOptions = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: {
    targets: [
      // 控制台输出
      {
        target: 'pino-pretty',
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      },
      // 文件输出
      {
        target: 'pino/file',
        level: 'info',
        options: {
          destination: path.join(LOG_DIR, 'app.log'),
          mkdir: true
        }
      }
    ]
  }
}

// 创建主日志实例
export const logger = pino(defaultLogOptions)

// 创建模块特定的日志实例
export function createLogger(module: string) {
  return logger.child({ module })
}

// 任务日志
export const taskLogger = createLogger('task')

// 系统日志
export const systemLogger = createLogger('system')

// API日志
export const apiLogger = createLogger('api')
