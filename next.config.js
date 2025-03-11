/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      config.module.rules.push({
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['next/babel'],
            },
          },
        ],
      })
      return config
    }
  }
  
  module.exports = nextConfig