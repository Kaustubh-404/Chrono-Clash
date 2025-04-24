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
  reactStrictMode: true,
  experimental: {
    // This suppresses various warnings including params access warnings
    instrumentationHook: false,
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
