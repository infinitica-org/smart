import type { NextConfig } from 'next';
import { withSmartConfig } from '@smart/next-config';

const apiProxyTarget = (process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000').replace(
  /\/$/u,
  '',
);

const config: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [{ source: '/api/v1/:path*', destination: `${apiProxyTarget}/api/v1/:path*` }];
  },
};

export default withSmartConfig(config);
