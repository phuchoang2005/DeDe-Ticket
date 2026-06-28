/** @type {import('next').NextConfig} */

// Backend origin used for the dev/prod reverse-proxy rewrite. In Docker this is
// the compose service name (http://backend:8080); locally it falls back to the
// host port. Mirrors the old nginx `location /v1/ { proxy_pass ... }` block.
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8080';

const nextConfig = {
  // Emit a self-contained server bundle so the production image can run
  // `node server.js` without node_modules (replaces the nginx static serve).
  output: 'standalone',

  // ESLint is run as a separate `npm run lint` step; don't fail the build on it.
  eslint: { ignoreDuringBuilds: true },

  async rewrites() {
    // Same-origin `/v1/*` calls (when apiBaseUrl is empty, e.g. prod) are proxied
    // to the backend. In dev the browser usually calls the backend directly via
    // NEXT_PUBLIC_API_BASE_URL, so this rewrite is a harmless fallback.
    return [
      { source: '/v1/:path*', destination: `${BACKEND_URL}/v1/:path*` },
    ];
  },
};

export default nextConfig;
