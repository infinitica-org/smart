/**
 * Creates a shared Next.js configuration for SMART portals.
 * Applies standard transpilePackages, standalone output, and merges custom config.
 */
export function withSmartConfig(config = {}) {
    const baseConfig = {
        allowedDevOrigins: ['localhost', '127.0.0.1', 'localhost:3001', '127.0.0.1:3001'],
        output: 'standalone',
        transpilePackages: [
            '@smart/ui',
            '@smart/api-client',
            '@smart/contracts',
            'motion',
            '@mediapipe/tasks-vision',
        ],
        ...config,
    };
    return baseConfig;
}
//# sourceMappingURL=index.js.map