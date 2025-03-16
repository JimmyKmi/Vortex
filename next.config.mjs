/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {ignoreDuringBuilds: true},
    typescript: {ignoreBuildErrors: true},
    images: {unoptimized: true},
    experimental: {webpackBuildWorker: true},
    output: 'standalone',
    assetPrefix: process.env.SITE_HOST || undefined,
    webpack: (config) => {
        config.externals = [...(config.externals || []), 'crypto', 'node:crypto']
        return config
    },
    env: {
        // 环境变量由lib/env.ts统一管理
        // NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
    serverRuntimeConfig: {
        hostname: '0.0.0.0',
        port: 3000
    }
}

export default nextConfig
