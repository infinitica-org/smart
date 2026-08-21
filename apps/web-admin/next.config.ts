import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@smart/ui', '@smart/api-client', '@smart/contracts'],
};

export default config;
