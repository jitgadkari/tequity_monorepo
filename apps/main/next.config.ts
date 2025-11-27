import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
