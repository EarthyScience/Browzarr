const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? (process.env.BASE_PATH || '') : '';
const assetPrefix = isProd ? (basePath ? `${basePath.replace(/\/$/, '')}/` : '') : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export' as const,
  basePath: basePath,
  trailingSlash: true,
  assetPrefix: assetPrefix,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@mattnucc/gribberish'],
};

export default nextConfig;