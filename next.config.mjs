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
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'crypto', 'node:crypto']
    return config
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
}

export default nextConfig
