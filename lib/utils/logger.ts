import pino from 'pino'
import path from 'path'
import fs from 'fs'
import pretty from 'pino-pretty'

// 确保日志目录存在
const LOG_DIR = path.join(process.cwd(), 'data', 'logs')
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
} catch (err) {
  console.error('Failed to create log directory:', err)
}

// 配置日志文件路径
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`)

// 创建格式化流
const prettyStream = pretty({
  colorize: true,
  translateTime: 'SYS:HH:MM:ss.l',
  messageFormat: '{msg}',
  ignore: 'pid,hostname',
  customPrettifiers: {
    time: (timestamp) => `[${timestamp}]`
  }
})

// 配置logger
const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({})
  },
  messageKey: 'msg',
  timestamp: true
}, pino.multistream([
  { stream: prettyStream },
  { stream: fs.createWriteStream(LOG_FILE, { flags: 'a' }) }
]))

// 导出
export default logger
