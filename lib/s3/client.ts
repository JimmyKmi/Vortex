import { S3Client } from '@aws-sdk/client-s3'
import { S3_CONFIG } from '../env'

// 检查是否在服务器端运行
const isServer = typeof window === 'undefined'

// 创建 S3 客户端配置
let clientConfig: any; // 使用any类型暂时解决类型问题

// 客户端环境只创建基本配置，实际操作在服务器端进行
if (!isServer) {
  // 客户端只需要基本配置用于显示，不会实际执行S3操作
  clientConfig = {
    region: S3_CONFIG.region || 'oss-cn-hangzhou',
    endpoint: S3_CONFIG.endpoint || 'https://oss-cn-hangzhou.aliyuncs.com',
    forcePathStyle: false, // 阿里云OSS不支持path style
  };
} else {
  // 服务器端创建完整配置
  try {
    // 判断是否使用阿里云OSS
    const isAliyunOSS = S3_CONFIG.endpoint?.includes('aliyuncs.com');
    
    clientConfig = {
      region: S3_CONFIG.region,
      endpoint: S3_CONFIG.endpoint,
      forcePathStyle: !isAliyunOSS, // 阿里云OSS不支持path style
      credentials: {
        accessKeyId: S3_CONFIG.accessKeyId as string,
        secretAccessKey: S3_CONFIG.secretAccessKey as string
      }
    };
    
  } catch (error) {
    console.error('Error configuring S3 client:', error);
    // 使用一个最小配置，避免应用崩溃
    clientConfig = {
      region: 'oss-cn-hangzhou',
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      forcePathStyle: false, // 阿里云OSS不支持path style
      credentials: {
        accessKeyId: 'dev-key',
        secretAccessKey: 'dev-secret'
      }
    };
  }
}

// 导出 S3 客户端
export const s3Client = new S3Client(clientConfig); 