/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    forceSwcTransforms: true,
  },
  output: 'export', // Untuk ekspor statis
  images: {
    unoptimized: true, // Diperlukan untuk ekspor statis
  },
}

module.exports = nextConfig