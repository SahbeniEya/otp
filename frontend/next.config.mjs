/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    instrumentationHook: false,
  },
  // Suppress hydration warnings caused by browser extensions
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Custom webpack config to handle hydration mismatches
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress specific hydration warnings in development
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        if (entries['main.js'] && !entries['main.js'].includes('./suppress-hydration-warnings.js')) {
          entries['main.js'].unshift('./suppress-hydration-warnings.js');
        }
        return entries;
      };
    }
    return config;
  }
};

export default nextConfig;
