import type { NextConfig } from "next";

// Shared hosting (cPanel / CloudLinux) shows the host's 32 CPUs but limits the account to
// one: `NEXT_BUILD_CPUS=1 npm run build` keeps the build's workers inside that limit.
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || undefined;

const nextConfig: NextConfig = {
  experimental: buildCpus ? { cpus: buildCpus, staticGenerationMaxConcurrency: 2 } : {},
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // src/lib/env.ts builds the upload dir from process.cwd() ("uploads"): the tracer would pull the local files into standalone.
  outputFileTracingExcludes: { "/*": ["./uploads/**/*"] },
  poweredByHeader: false,
  cacheComponents: true,
  // Images are resized once at upload (sharp); the server never resizes per request (1 CPU).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          ...(process.env.SITE_NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
        ],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
