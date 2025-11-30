import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',

  // Transpile workspace packages
  transpilePackages: ['@tequity/database', '@tequity/types', '@tequity/utils'],

  // Mark Pulumi and its transitive dependencies as external
  // These packages have native Node.js dependencies that can't be bundled by webpack
  serverExternalPackages: [
    '@pulumi/pulumi',
    '@npmcli/arborist',
    '@npmcli/run-script',
    'node-gyp',
  ],

  // Webpack configuration for additional externals
  webpack: (config, { isServer }) => {
    // Ignore non-JS files that shouldn't be bundled (like .cs files from node-gyp)
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.(cs|ps1|cmd|bat)$/,
      use: 'null-loader',
    });

    // Also ignore these file extensions in resolve
    config.resolve = config.resolve || {};
    config.resolve.extensions = config.resolve.extensions || [];

    // Add fallbacks to prevent bundling native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      child_process: false,
      net: false,
      tls: false,
    };

    if (isServer) {
      // Externalize pulumi-related packages from the server bundle
      const externals = config.externals || [];

      config.externals = [
        ...(Array.isArray(externals) ? externals : [externals]),
        ({ request }: { request?: string }, callback: (err?: null, result?: string) => void) => {
          // Externalize @pulumi/* packages
          if (request?.startsWith('@pulumi/')) {
            return callback(null, `commonjs ${request}`);
          }
          // Externalize node-gyp and related
          if (request?.includes('node-gyp') || request?.includes('@npmcli')) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
};

export default nextConfig;
