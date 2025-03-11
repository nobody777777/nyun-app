/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gunakan SWC compiler bawaan Next.js
  experimental: {
    forceSwcTransforms: true,
  }
}

module.exports = nextConfig