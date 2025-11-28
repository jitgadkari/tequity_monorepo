import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',

  // Transpile workspace packages for proper bundling
  transpilePackages: ['@tequity/database', '@tequity/utils', '@tequity/types'],

  // Ensure these packages are bundled server-side
  serverExternalPackages: [],

  typescript: {
    // Allow builds to succeed even with type errors
    // TODO: Fix all type errors and remove this
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow builds to succeed even with lint errors
    // TODO: Fix all lint errors and remove this
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
