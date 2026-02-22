import type { NextConfig } from "next";

const nextConfig: NextConfig = {  images: {
    remotePatterns: [new URL('https://pub-c77f098c0f7e4c41ae25115eea725693.r2.dev/**')],
  },
};

export default nextConfig;
