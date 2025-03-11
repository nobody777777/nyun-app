/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true // Sementara kita ignore error TypeScript
  },
  swcMinify: true
}

module.exports = nextConfig
