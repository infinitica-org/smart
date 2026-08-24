/**
 * Creates a shared Next.js configuration for SMART portals.
 * Applies standard transpilePackages, standalone output, and merges custom config.
 */
export function withSmartConfig(config = {}) {
  const baseConfig = {
    output: 'standalone',
    transpilePackages: ['@smart/ui', '@smart/api-client', '@smart/contracts'],
    ...config,
  };
  return baseConfig;
}
//# sourceMappingURL=index.js.map
