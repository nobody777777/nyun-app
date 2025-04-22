/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  experimental: {
    forceSwcTransforms: true,
  },
  images: {
    unoptimized: true, // Diperlukan untuk ekspor statis
  },
  // Tambahkan konfigurasi untuk menangani resource
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Accept',
            value: '*/*',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig