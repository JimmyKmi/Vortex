/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true
  },
  output: 'standalone',
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'crypto', 'node:crypto']
    return config
  },
  env: {
    // 环境变量由lib/env.ts统一管理
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
}

export default nextConfig
