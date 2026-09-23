import type { NextConfig } from 'next';
import { withSmartConfig } from '@smart/next-config';

const config: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', 'localhost:3006', '127.0.0.1:3006'],
  transpilePackages: [
    '@smart/ui',
    '@smart/api-client',
    '@smart/contracts',
    'motion',
    '@mediapipe/tasks-vision',
    'motion',
    'gsap',
    'lenis',
    'ogl',
  ],
};

export default withSmartConfig(config);
