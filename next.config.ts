import type { Configuration } from 'webpack';
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export' as const,
  images: {
    unoptimized: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Turbopack config for dev mode
  turbopack: {
    rules: {
      '*.{glsl,vs,fs,vert,frag}': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
  // Webpack config for build mode
  webpack: (config: Configuration) => {
    if (!config.module) config.module = { rules: [] };
    if (!config.module.rules) config.module.rules = [];
    
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    // Add path alias resolution
    if (!config.resolve) config.resolve = { alias: {} };
    if (!config.resolve.alias) config.resolve.alias = {};
    
    // Explicitly set path aliases to match tsconfig.json
    (config.resolve.alias as { [key: string]: string })['@'] = path.resolve(__dirname, 'src');
    (config.resolve.alias as { [key: string]: string })['@/components'] = path.resolve(__dirname, 'src/components');
    return config;
  },
};

module.exports = nextConfig;