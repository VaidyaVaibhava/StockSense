/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Required for Docker standalone build
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  images: {
    unoptimized: true,
  },

  // Silence noisy transpile warnings from firebase
  transpilePackages: ['firebase'],

  // Disable type-check and lint during Docker build (run separately in CI)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
