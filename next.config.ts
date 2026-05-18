import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/generative-ai'],
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
  experimental: {
    proxyClientMaxBodySize: '450mb',
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
