import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@google/generative-ai',
    '@google-cloud/storage',
    '@google-cloud/vertexai',
    '@ffmpeg-installer/ffmpeg',
    '@ffprobe-installer/ffprobe',
    'fluent-ffmpeg',
  ],
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
    // Match analysis: video up to 1GB + reference frame in one FormData body
    proxyClientMaxBodySize: '1100mb',
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
