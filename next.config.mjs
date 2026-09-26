/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We allow image domains if needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
