import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: '/static/:path*',
      },
    ]
  },
};

export default nextConfig;